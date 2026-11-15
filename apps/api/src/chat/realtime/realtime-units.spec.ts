import { describe, it, expect, vi, afterEach } from "vitest";
import { TokenBucket } from "./token-bucket.js";
import { ChatTypingTracker } from "./chat-typing.tracker.js";
import { loadChatRealtimeConfig } from "./chat-realtime.config.js";
import { conversationIdFromRoom, conversationRoom, userRoom } from "./chat-rooms.js";
import {
  SOCKET_MAX_HTTP_BUFFER_SIZE,
  SOCKET_SERVER_OPTIONS,
  isSocketOriginAllowed,
  trustedSocketOrigins,
} from "../../common/websocket/socket-server.options.js";

describe("TokenBucket", () => {
  it("allows a burst up to capacity, then refills over time", () => {
    let now = 0;
    const bucket = new TokenBucket(3, 1, () => now);
    expect([bucket.tryRemove(), bucket.tryRemove(), bucket.tryRemove()]).toEqual([
      true,
      true,
      true,
    ]);
    expect(bucket.tryRemove()).toBe(false);
    now = 999;
    expect(bucket.tryRemove()).toBe(false);
    now = 1000;
    expect(bucket.tryRemove()).toBe(true);
    now = 100_000;
    expect([
      bucket.tryRemove(),
      bucket.tryRemove(),
      bucket.tryRemove(),
      bucket.tryRemove(),
    ]).toEqual([true, true, true, false]); // never exceeds capacity
  });
});

describe("ChatTypingTracker", () => {
  afterEach(() => vi.useRealTimers());

  it("throttles repeated starts and always ends with exactly one stop on expiry", () => {
    vi.useFakeTimers();
    const calls: Array<[string, boolean]> = [];
    const tracker = new ChatTypingTracker(
      (id, typing) => calls.push([id, typing]),
      6000,
      2500,
      () => Date.now(),
    );
    tracker.start("c1");
    vi.advanceTimersByTime(1000);
    tracker.start("c1"); // within throttle: extends expiry, no broadcast
    expect(calls).toEqual([["c1", true]]);
    vi.advanceTimersByTime(2000);
    tracker.start("c1"); // 3s since last broadcast: re-broadcast
    expect(calls).toEqual([
      ["c1", true],
      ["c1", true],
    ]);
    vi.advanceTimersByTime(5999);
    expect(tracker.isTyping("c1")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(tracker.isTyping("c1")).toBe(false);
    expect(calls.at(-1)).toEqual(["c1", false]);
  });

  it("stop / stopAll broadcast once and are idempotent", () => {
    vi.useFakeTimers();
    const calls: Array<[string, boolean]> = [];
    const tracker = new ChatTypingTracker((id, typing) => calls.push([id, typing]));
    tracker.start("a");
    tracker.start("b");
    tracker.stop("a");
    tracker.stop("a");
    tracker.stopAll();
    tracker.stopAll();
    expect(calls.filter(([, typing]) => !typing)).toEqual([
      ["a", false],
      ["b", false],
    ]);
    vi.advanceTimersByTime(60_000); // expired timers were cleared: no extra stops
    expect(calls.filter(([, typing]) => !typing)).toHaveLength(2);
  });
});

describe("socket origin policy (S-2)", () => {
  it("uses WS_CORS_ORIGINS, falling back to CORS_ORIGIN, never '*'", () => {
    expect(
      trustedSocketOrigins({ WS_CORS_ORIGINS: "https://app.dhruto.com, https://ops.dhruto.com/" }),
    ).toEqual(["https://app.dhruto.com", "https://ops.dhruto.com"]);
    expect(trustedSocketOrigins({ CORS_ORIGIN: "https://app.dhruto.com" })).toEqual([
      "https://app.dhruto.com",
    ]);
    expect(trustedSocketOrigins({ WS_CORS_ORIGINS: "*", NODE_ENV: "production" })).toEqual([]);
  });

  it("fails closed in production when unconfigured, defaults to local web app in development", () => {
    expect(isSocketOriginAllowed("http://localhost:5000", { NODE_ENV: "production" })).toBe(false);
    expect(isSocketOriginAllowed("http://localhost:5000", { NODE_ENV: "development" })).toBe(true);
  });

  it("rejects untrusted origins, allows exact (case/slash-insensitive) matches and non-browser clients", () => {
    const env = { NODE_ENV: "production", WS_CORS_ORIGINS: "https://app.dhruto.com" };
    expect(isSocketOriginAllowed("https://evil.example", env)).toBe(false);
    expect(isSocketOriginAllowed("https://app.dhruto.com.evil.example", env)).toBe(false);
    expect(isSocketOriginAllowed("HTTPS://APP.DHRUTO.COM/", env)).toBe(true);
    expect(isSocketOriginAllowed(undefined, env)).toBe(true);
  });

  it("bounds inbound packet size and checks Origin on every handshake", () => {
    expect(SOCKET_SERVER_OPTIONS.maxHttpBufferSize).toBe(SOCKET_MAX_HTTP_BUFFER_SIZE);
    expect(typeof SOCKET_SERVER_OPTIONS.allowRequest).toBe("function");
  });
});

describe("realtime config and rooms", () => {
  it("requires Redis by default only in production; TTL exceeds two heartbeats", () => {
    expect(loadChatRealtimeConfig({ NODE_ENV: "production" }).redisRequired).toBe(true);
    expect(loadChatRealtimeConfig({ NODE_ENV: "development" }).redisRequired).toBe(false);
    const cfg = loadChatRealtimeConfig({
      CHAT_PRESENCE_HEARTBEAT_MS: "10000",
      CHAT_PRESENCE_TTL_MS: "5000",
    });
    expect(cfg.presenceTtlMs).toBeGreaterThan(cfg.presenceHeartbeatMs * 2);
  });

  it("room names are server-defined and parseable", () => {
    expect(userRoom("u1")).toBe("u:u1");
    expect(conversationIdFromRoom(conversationRoom("abc"))).toBe("abc");
    expect(conversationIdFromRoom(userRoom("abc"))).toBeNull();
  });
});
