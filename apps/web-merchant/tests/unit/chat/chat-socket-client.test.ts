import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Socket } from "socket.io-client";
import { ChatClientEvent, ChatServerEvent, ChatSocketErrorCode } from "@dhruto/contracts";
import { ChatSocketClient, type IoFactory } from "../../../features/chat/realtime/chat-socket-client";
import type { ChatConnectionState } from "../../../features/chat/state/chat-ephemeral.slice";

type Listener = (...args: unknown[]) => void;

/** Minimal Socket.IO client double: records listeners, emits and connects. */
class FakeSocket {
  connected = false;
  active = true;
  connectCalls = 0;
  emitted: Array<{ event: string; payload: unknown }> = [];
  ackResponse: unknown = { ok: true, data: {} };
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }
  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }
  removeAllListeners() {
    this.listeners.clear();
    return this;
  }
  listenerCount(event: string) {
    return this.listeners.get(event)?.size ?? 0;
  }
  fire(event: string, ...args: unknown[]) {
    for (const listener of [...(this.listeners.get(event) ?? [])]) listener(...args);
  }
  connect() {
    this.connectCalls += 1;
    return this;
  }
  disconnect() {
    this.connected = false;
    return this;
  }
  timeout() {
    return {
      emitWithAck: async (event: string, payload: unknown) => {
        this.emitted.push({ event, payload });
        if (this.ackResponse instanceof Error) throw this.ackResponse;
        return this.ackResponse;
      },
    };
  }
}

function setup(overrides: { token?: string | null; refresh?: () => Promise<boolean>; maxAuthRetries?: number } = {}) {
  const socket = new FakeSocket();
  const calls: { url: string; options: Record<string, unknown> }[] = [];
  const ioFactory: IoFactory = (url, options) => {
    calls.push({ url, options: options as Record<string, unknown> });
    return socket as unknown as Socket;
  };
  const states: ChatConnectionState[] = [];
  const scheduled: Array<{ fn: () => void; ms: number }> = [];
  const onConnected = vi.fn();
  const refreshSession = vi.fn(overrides.refresh ?? (async () => true));
  const token = "token" in overrides ? overrides.token : "access-token";
  const client = new ChatSocketClient({
    origin: "https://api.example.test",
    getToken: () => token ?? null,
    refreshSession,
    onStateChange: (state) => states.push(state),
    onConnected,
    ioFactory,
    maxAuthRetries: overrides.maxAuthRetries ?? 2,
    schedule: (fn, ms) => scheduled.push({ fn, ms }),
  });
  client.connect();
  return { client, socket, calls, states, scheduled, onConnected, refreshSession };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ChatSocketClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("connects to the /chat namespace with the token in the auth callback, never the URL", () => {
    const { calls } = setup();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.example.test/chat");
    expect(calls[0]!.url).not.toContain("access-token");
    const auth = calls[0]!.options.auth as (cb: (data: object) => void) => void;
    let sent: object | null = null;
    auth((data) => (sent = data));
    expect(sent).toEqual({ token: "access-token" });
    expect(calls[0]!.options.transports).toEqual(["websocket"]);
  });

  it("reports connecting -> connected and flags reconnects for recovery", () => {
    const { socket, states, onConnected } = setup();
    socket.connected = true;
    socket.fire("connect");
    socket.fire("disconnect", "transport close");
    socket.fire("connect");
    expect(states).toEqual(["connecting", "connected", "reconnecting", "connected"]);
    expect(onConnected.mock.calls).toEqual([[{ reconnected: false }], [{ reconnected: true }]]);
  });

  it("on an auth rejection refreshes the session then reconnects with backoff", async () => {
    const { socket, scheduled, refreshSession } = setup();
    socket.fire("connect_error", Object.assign(new Error("auth"), { data: { code: ChatSocketErrorCode.TOKEN_EXPIRED } }));
    await flush();
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]!.ms).toBeGreaterThanOrEqual(750);
    expect(scheduled[0]!.ms).toBeLessThanOrEqual(1250);
    scheduled[0]!.fn();
    expect(socket.connectCalls).toBe(1);
  });

  it("gives up as `unauthorized` after the retry budget (no reconnect loop)", async () => {
    const { socket, states, scheduled } = setup({ maxAuthRetries: 2 });
    const authError = Object.assign(new Error("auth"), { data: { code: ChatSocketErrorCode.UNAUTHENTICATED } });
    for (let i = 0; i < 3; i += 1) {
      socket.fire("connect_error", authError);
      await flush();
    }
    expect(scheduled).toHaveLength(2);
    expect(states[states.length - 1]).toBe("unauthorized");
  });

  it("stops immediately when the refresh fails and no token remains", async () => {
    const { socket, states, scheduled } = setup({ token: null, refresh: async () => false });
    socket.fire("connect_error", Object.assign(new Error("auth"), { data: { code: ChatSocketErrorCode.UNAUTHENTICATED } }));
    await flush();
    expect(scheduled).toHaveLength(0);
    expect(states[states.length - 1]).toBe("unauthorized");
  });

  it("re-authenticates after a server-initiated disconnect (session expiry)", async () => {
    const { socket, refreshSession } = setup();
    socket.fire("disconnect", "io server disconnect");
    await flush();
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("transport errors leave reconnection to Socket.IO without refreshing", async () => {
    const { socket, states, refreshSession } = setup();
    socket.fire("connect_error", new Error("xhr poll error"));
    await flush();
    expect(refreshSession).not.toHaveBeenCalled();
    expect(states[states.length - 1]).toBe("reconnecting");
  });

  it("listeners unsubscribe cleanly and disconnect removes everything", () => {
    const { client, socket } = setup();
    const handler = vi.fn();
    const off = client.on(ChatServerEvent.MESSAGE_NEW, handler);
    socket.fire(ChatServerEvent.MESSAGE_NEW, { eventId: "e1" });
    off();
    socket.fire(ChatServerEvent.MESSAGE_NEW, { eventId: "e2" });
    expect(handler).toHaveBeenCalledTimes(1);
    client.disconnect();
    expect(socket.listenerCount("connect")).toBe(0);
    expect(client.isConnected()).toBe(false);
  });

  it("requests return null when disconnected so callers fall back to REST", async () => {
    const { client, socket } = setup();
    expect(await client.markRead("c1", "5")).toBeNull();
    expect(socket.emitted).toHaveLength(0);
  });

  it("emits protocol events with acks and treats timeouts / malformed acks as null", async () => {
    const { client, socket } = setup();
    socket.connected = true;
    socket.ackResponse = { ok: true, data: { conversationId: "c1" } };
    expect(await client.join("c1")).toEqual({ ok: true, data: { conversationId: "c1" } });
    expect(socket.emitted[0]).toEqual({ event: ChatClientEvent.CONVERSATION_JOIN, payload: { conversationId: "c1" } });
    socket.ackResponse = new Error("operation has timed out");
    expect(await client.typing("c1", true)).toBeNull();
    socket.ackResponse = "garbage";
    expect(await client.markDelivered("c1", "3")).toBeNull();
  });
});
