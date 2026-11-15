import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { setCredentials } from "@/store/auth.slice";
import { apiSocketOrigin } from "@/lib/api/socket-origin";
import { installLocalStorageMock } from "../storage-mock";

installLocalStorageMock();

type Listener = (...args: unknown[]) => void;
const sockets: FakeSocket[] = [];
const ioCalls: Array<{ url: string; options: Record<string, unknown> }> = [];

class FakeSocket {
  connected = false;
  disconnected = false;
  listeners = new Map<string, Set<Listener>>();
  emitted: string[] = [];
  on(event: string, listener: Listener) {
    (this.listeners.get(event) ?? this.listeners.set(event, new Set()).get(event)!).add(listener);
    return this;
  }
  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }
  emit(event: string) {
    this.emitted.push(event);
    return this;
  }
  disconnect() {
    this.disconnected = true;
    return this;
  }
  get total() {
    return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

vi.mock("socket.io-client", () => ({
  io: (url: string, options: Record<string, unknown>) => {
    ioCalls.push({ url, options });
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  },
}));

import { useNotificationSocket } from "../../../features/notifications/hooks/use-notification-socket";

function mountWithSession() {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      user: { id: "u-1", email: "merchant@example.test", name: "Merchant", phone: "01700000000", role: "MERCHANT" },
      accessToken: "access",
      refreshToken: "refresh",
    }),
  );
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useNotificationSocket(), { wrapper });
}

describe("notification socket after the legacy chat removal (S-1)", () => {
  beforeEach(() => {
    sockets.length = 0;
    ioCalls.length = 0;
  });

  it("exposes only notification state — no chat helpers", () => {
    const { result, unmount } = mountWithSession();
    expect(Object.keys(result.current).sort()).toEqual(["isConnected", "latestNotification"]);
    unmount();
  });

  it("connects to the default namespace, registers no chat listeners and emits nothing chat-related", () => {
    const { unmount } = mountWithSession();
    expect(ioCalls[0]!.url).toBe(apiSocketOrigin());
    expect(ioCalls[0]!.url).not.toContain("/chat");
    const events = [...sockets[0]!.listeners.keys()];
    expect(events.some((event) => event.startsWith("chat:"))).toBe(false);
    expect(sockets[0]!.emitted).toEqual([]);
    unmount();
  });

  it("removes its listeners and disconnects the shared socket on unmount", () => {
    const { unmount } = mountWithSession();
    expect(sockets[0]!.total).toBe(4);
    unmount();
    expect(sockets[0]!.total).toBe(0);
    expect(sockets[0]!.disconnected).toBe(true);
  });
});

describe("apiSocketOrigin", () => {
  it("strips the REST prefix and falls back safely", () => {
    expect(apiSocketOrigin("https://api.example.test/api/v1")).toBe("https://api.example.test");
    expect(apiSocketOrigin("not a url")).toBe("http://localhost:4000");
    expect(apiSocketOrigin("")).toBe("http://localhost:4000");
  });
});
