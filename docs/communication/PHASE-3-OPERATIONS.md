# Communication Platform — Phase 3 Operations

## 1. Dependencies

| Component     | Requirement                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL 16 | Unchanged. Phase 1 and 2 migrations (`0010`, `0011`) must be applied. **No new migration in Phase 3**                                                                                                                      |
| Redis 7       | The **same** deployment the API already uses (cache, rate limits, BullMQ). Realtime opens 2 extra connections per API instance (publisher, subscriber)                                                                     |
| npm packages  | `@socket.io/redis-adapter@8.3.0` (new runtime dependency); `socket.io-client@4.8.4` (dev, tests)                                                                                                                           |
| Load balancer | Must allow WebSocket upgrades on the API host. **No sticky sessions needed** with `transports: ["websocket"]`. If clients may fall back to HTTP long-polling, enable sticky sessions (a Socket.IO requirement for polling) |

## 2. Environment variables

Existing variables reused: `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`, or the Upstash pair), `JWT_ACCESS_SECRET`, `NODE_ENV`, `CORS_ORIGIN`, `OUTBOX_POLL_MS`.

| Variable                                                    | Default                            | Purpose                                                                                                                          |
| ----------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `WS_CORS_ORIGINS`                                           | falls back to `CORS_ORIGIN`        | Comma-separated trusted browser origins for sockets. `*` is ignored. **Production: required** (unset means browsers are refused) |
| `CHAT_REALTIME_REDIS_ENABLED`                               | `true`                             | `false` = single-instance in-memory adapter and presence (development only)                                                      |
| `CHAT_REALTIME_REQUIRE_REDIS`                               | `true` in production, else `false` | When true, readiness fails while Redis distribution is unhealthy                                                                 |
| `CHAT_REALTIME_REDIS_PROBE_MS`                              | `5000`                             | Redis PING probe interval (bounds the undetected-outage window)                                                                  |
| `CHAT_PRESENCE_HEARTBEAT_MS` / `CHAT_PRESENCE_TTL_MS`       | `25000` / `70000`                  | Presence refresh and connection expiry (TTL is forced > 2× heartbeat)                                                            |
| `CHAT_PRESENCE_LAST_SEEN_TTL_SECONDS`                       | `604800`                           | `lastSeenAt` retention                                                                                                           |
| `CHAT_ROOM_REVALIDATE_MS`                                   | `60000`                            | Re-authorization of joined conversation rooms                                                                                    |
| `CHAT_SOCKET_EVENTS_PER_SECOND` / `CHAT_SOCKET_EVENT_BURST` | `10` / `30`                        | Per-socket inbound budget                                                                                                        |
| `CHAT_SOCKET_JOINS_PER_MINUTE`                              | `60`                               | Per-socket join budget                                                                                                           |
| `CHAT_SOCKET_CONNECTIONS_PER_MINUTE`                        | `30`                               | Per-user handshake budget                                                                                                        |
| `CHAT_SOCKET_MAX_STRIKES`                                   | `20`                               | Rate-limit strikes before disconnect                                                                                             |

Production Redis should use TLS and credentials (`rediss://user:password@host:6379`). Never commit real values.

## 3. Redis usage

| Key / channel                        | Purpose                                    | Bound                                 |
| ------------------------------------ | ------------------------------------------ | ------------------------------------- |
| `dhruto-socket.io#…` channels        | Socket.IO adapter pub/sub (no stored data) | —                                     |
| `dhruto:chat:presence:conn:<userId>` | Sorted set of live connection ids          | Expires (2× TTL); stale members swept |
| `dhruto:chat:presence:seen:<userId>` | Last seen epoch ms                         | `CHAT_PRESENCE_LAST_SEEN_TTL_SECONDS` |
| `rl:chat-connect:<userId>`           | Handshake rate counter                     | 60 s                                  |

Redis is **not** a message store. A total Redis loss loses only presence and in-flight realtime notifications. Messages, cursors and outbox rows live in PostgreSQL.

## 4. Health and readiness

| Endpoint (no global prefix in production) | Meaning                                                                                                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health/readiness`                   | 503 if the DB or cache is down, **or** realtime isn't ready (gateway not initialised, or Redis required but unhealthy). The response includes `checks.realtime`            |
| `GET /health/realtime`                    | Detailed realtime status. `status: ready \| degraded \| not_ready`. `degraded` means Redis is configured but unhealthy while not required; it is never reported as `ready` |

`/health/realtime` fields: `redis.{distribution, healthy, publisher, subscriber, lastProbeOk, publishFailures}`, `presenceBackend`, `connections.{current,total,rejected}`, `events.{received,rateLimited,invalid,joinsDenied,revocations}`, `fanout.{delivered,failed,skipped,lastLatencyMs,maxLatencyMs}`. Counters are per instance.

## 5. Lifecycle

- **Startup** never blocks on Redis: connections are made in the background with capped exponential backoff (≤5 s). Until healthy, fan-out defers events (outbox retry) and presence uses memory.
- **Graceful shutdown** (`SIGTERM`, `enableShutdownHooks`): the gateway and Socket.IO server close first (clients reconnect to another instance), then the Redis connections quit (`onApplicationShutdown`).
- **Rolling deploys:** clients reconnect and follow the recovery protocol (`PHASE-3-REALTIME-PROTOCOL.md` §10). No server-side session state needs to migrate.

## 6. Troubleshooting

| Symptom                                             | Check                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Messages saved but not pushed                       | `/health/realtime`: `redis.healthy`, `fanout.failed`. `event_outbox` rows with `status = 'PENDING'` and `last_error ~ 'unavailable'` mean the relay is retrying because Redis is down; they drain automatically when it recovers. `FAILED` rows (after 8 attempts) can be replayed via the existing outbox admin replay |
| Users on instance A don't see events relayed by B   | `redis.distribution = redis` and `healthy = true` on **both** instances; same `REDIS_URL`; adapter key `dhruto-socket.io`                                                                                                                                                                                               |
| Browser can't connect                               | `WS_CORS_ORIGINS` contains the exact origin (scheme + host + port); `connect_error` without a payload means an origin rejection                                                                                                                                                                                         |
| `connect_error` `TOKEN_EXPIRED` / `UNAUTHENTICATED` | Refresh the token; the account may be inactive                                                                                                                                                                                                                                                                          |
| Frequent `RATE_LIMITED` / disconnects               | `events.rateLimited`; tune `CHAT_SOCKET_*` only after confirming the client isn't looping                                                                                                                                                                                                                               |
| Presence stuck online                               | Entries expire after `CHAT_PRESENCE_TTL_MS` even if an instance crashes; check `presenceBackend`                                                                                                                                                                                                                        |
| Legacy clients emitting `chat:*`                    | Expected `LEGACY_CHAT_EVENT_REJECTED` warnings from NotificationsGateway; update the client to `/chat`                                                                                                                                                                                                                  |

Useful log events: `SOCKET_CONNECTED`, `SOCKET_DISCONNECTED`, `SOCKET_REJECTED code=…`, `SOCKET_FLOOD_DISCONNECT`, `REALTIME_REDIS_READY/ERROR/ENDED`, `REALTIME_REDIS_PROBE_FAILED`, `REALTIME_FANOUT_SKIPPED`, `PRESENCE_REDIS_FAILED`, `ROOM_REVALIDATION_FAILED`. None contain tokens or message content.

## 7. Capacity (not yet measured)

No load test was run in Phase 3. Before production, run a soak test with, for example, k6 or Artillery plus `socket.io-client` against at least 2 instances behind the real load balancer. Measure:

- p50/p95/p99 latency from REST send to `message:new`;
- connections per instance;
- Redis ops/s and memory;
- PostgreSQL QPS from fan-out and revalidation;
- Node heap and event-loop lag (`/health/metrics`).

Scale-out levers: instances (horizontal), `OUTBOX_POLL_MS`/batch size, `CHAT_ROOM_REVALIDATE_MS`. Redis Cluster would need the sharded adapter (`createShardedAdapter`).
