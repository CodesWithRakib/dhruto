/**
 * Realtime tunables, read from the environment when the realtime services
 * start (after ConfigModule has loaded `.env`). Defaults are conservative.
 */
function envInt(env: NodeJS.ProcessEnv, name: string, fallback: number, min = 1): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function envBool(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

export interface ChatRealtimeConfig {
  /** Use Redis (Socket.IO adapter + presence). Disable only for single-instance dev. */
  redisEnabled: boolean;
  /** Readiness fails when Redis distribution is down (default: production only). */
  redisRequired: boolean;
  /** Presence heartbeat cadence and connection TTL (TTL > 2x heartbeat). */
  presenceHeartbeatMs: number;
  presenceTtlMs: number;
  /** Retention of `lastSeenAt` after a user goes offline. */
  presenceLastSeenTtlSeconds: number;
  /** Periodic re-authorization of joined conversation rooms. */
  roomRevalidateMs: number;
  /** Per-socket inbound event budget (token bucket). */
  eventsPerSecond: number;
  eventBurst: number;
  /** Per-socket conversation joins per minute. */
  joinsPerMinute: number;
  /** Per-user handshakes per minute (shared counter when Redis is up). */
  connectionsPerMinute: number;
  /** Rate-limit strikes before the socket is disconnected. */
  maxStrikes: number;
  /** Redis health probe interval. */
  redisProbeMs: number;
}

export function loadChatRealtimeConfig(env: NodeJS.ProcessEnv = process.env): ChatRealtimeConfig {
  const heartbeat = envInt(env, "CHAT_PRESENCE_HEARTBEAT_MS", 25_000, 1000);
  return {
    redisEnabled: envBool(env, "CHAT_REALTIME_REDIS_ENABLED", env.NODE_ENV !== "test"),
    redisRequired: envBool(env, "CHAT_REALTIME_REQUIRE_REDIS", env.NODE_ENV === "production"),
    presenceHeartbeatMs: heartbeat,
    presenceTtlMs: Math.max(
      envInt(env, "CHAT_PRESENCE_TTL_MS", 70_000, 2000),
      heartbeat * 2 + 1000,
    ),
    presenceLastSeenTtlSeconds: envInt(env, "CHAT_PRESENCE_LAST_SEEN_TTL_SECONDS", 7 * 24 * 3600),
    roomRevalidateMs: envInt(env, "CHAT_ROOM_REVALIDATE_MS", 60_000, 1000),
    eventsPerSecond: envInt(env, "CHAT_SOCKET_EVENTS_PER_SECOND", 10),
    eventBurst: envInt(env, "CHAT_SOCKET_EVENT_BURST", 30),
    joinsPerMinute: envInt(env, "CHAT_SOCKET_JOINS_PER_MINUTE", 60),
    connectionsPerMinute: envInt(env, "CHAT_SOCKET_CONNECTIONS_PER_MINUTE", 30),
    maxStrikes: envInt(env, "CHAT_SOCKET_MAX_STRIKES", 20),
    redisProbeMs: envInt(env, "CHAT_REALTIME_REDIS_PROBE_MS", 5000, 500),
  };
}
