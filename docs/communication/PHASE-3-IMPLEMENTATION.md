# Communication Platform — Phase 3 Implementation

Phase 3 adds the realtime engine:

- an authenticated `/chat` Socket.IO gateway;
- durable outbox-to-socket fan-out;
- a Redis adapter for multiple instances;
- Redis presence;
- typing indicators;
- cursor synchronization;
- the S-2 CORS/Origin fix.

The protocol is in `PHASE-3-REALTIME-PROTOCOL.md`, operations in `PHASE-3-OPERATIONS.md`, and security in `PHASE-3-SECURITY-REVIEW.md`.

## 1. Audit note (pre-implementation)

| Area                 | Finding                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway architecture | One Socket.IO server per port, shared by all Nest gateways. The server is created with the **first** gateway's options, so options must be identical. `NotificationsGateway` serves `/`, joins `user:/role:/merchant:/hub:/rider:` rooms from the JWT, and carries the S-1 guard: per-socket middleware on `/` sockets that drops `chat:*` packets without `next(err)` |
| S-1 coexistence      | `socket.use` guards are per socket. `/chat` sockets are separate objects, so a dedicated namespace is untouched by the legacy guard, and the guard keeps protecting `/`                                                                                                                                                                                                |
| Auth                 | Custom HS256 `CustomJwtService.verifyAccessToken`: signature, `type`, `exp` **if present**. No issuer or audience is configured in the API                                                                                                                                                                                                                             |
| Redis                | `config/redis.config.ts` (`REDIS_URL`, Upstash-derived URL, or host/port). `CacheService` owns a client with `retryStrategy: () => null` (never reconnects), so it is unsuitable for pub/sub. BullMQ uses its own connections. **No Socket.IO Redis adapter was installed**                                                                                            |
| Outbox               | Relay `FANOUT: Record<DomainEventType, FanoutTarget[]>`. Chat events had `[]`. `fanOut` runs inside the claim transaction; a throw causes `markAttemptFailed` (backoff 5 s → 5 min, FAILED after 8)                                                                                                                                                                    |
| Lifecycle            | `app.enableShutdownHooks()`. **Nest runs gateway `afterInit` before providers' `onModuleInit`**, and disposes the WebSocket server **after** `onModuleDestroy`. Both matter (see §5)                                                                                                                                                                                   |
| CORS (S-2)           | Gateway CORS was hardcoded to localhost; REST uses `CORS_ORIGIN`. Socket.IO `cors` covers only HTTP polling; browsers do not apply CORS to WebSocket upgrades                                                                                                                                                                                                          |

## 2. Components (`apps/api/src/chat/realtime/`)

| File                                                                | Responsibility                                                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chat.gateway.ts`                                                   | `/chat` gateway: handshake middleware hookup, sessions, `u:`/`c:` rooms, client events with typed acks, token-expiry disconnect, presence heartbeat loop, periodic room revalidation |
| `chat-socket-auth.ts`                                               | Handshake authentication (existing JWT service + DB user reload, mandatory `exp`, per-user handshake budget)                                                                         |
| `chat-realtime-fanout.service.ts`                                   | `RealtimeFanoutHandler`: durable event → eligible recipients → DB-loaded payload → emit; revocation on removal                                                                       |
| `chat-redis.service.ts`                                             | Two dedicated ioredis connections (pub/sub), resilient publisher, non-blocking connect with capped backoff, PING probe, adapter attach, graceful quit                                |
| `chat-presence.service.ts`                                          | Redis sorted-set presence (multi-device, TTL, atomic transitions), in-memory fallback                                                                                                |
| `chat-typing.tracker.ts`                                            | Per-socket typing state: throttle, TTL auto-stop, single stop guarantee                                                                                                              |
| `token-bucket.ts`                                                   | Per-socket event and join budgets                                                                                                                                                    |
| `chat-realtime-metrics.service.ts`                                  | Counters and readiness (`/health/realtime`, readiness probe)                                                                                                                         |
| `chat-socket-server.ts`, `chat-rooms.ts`, `chat-realtime.config.ts` | Namespace holder, room naming, env config                                                                                                                                            |
| `chat-realtime.module.ts`                                           | `@Global` module providing the `REALTIME_FANOUT_HANDLER` port and metrics                                                                                                            |

**Elsewhere:**

- `common/websocket/socket-server.options.ts`: shared server options (S-2).
- `integrations/realtime-fanout.port.ts`: relay ↔ realtime port.
- `health/health.controller.ts`: readiness plus `/health/realtime`.
- Contracts: `chat/chat-realtime.schema.ts`, and two new events, `chat.message_pinned.v1` / `chat.message_unpinned.v1`.

## 3. Event flow

1. A REST write commits domain rows plus an `event_outbox` row in one transaction (Phase 2, unchanged).
2. The relay claims due rows (`SKIP LOCKED`). For chat events, `FANOUT` now contains the `chat-realtime` target, so the relay calls `REALTIME_FANOUT_HANDLER.handle(event)` for **committed rows only**.
3. The handler:
   - throws `RealtimeUnavailableError` if this process has no gateway, or Redis distribution is unhealthy; the relay records a failed attempt and retries with backoff;
   - computes recipients as ACTIVE participants ∩ live eligibility (`ChatAuthorizationService.eligibleRecipientIds`, fixed query count);
   - loads the message from PostgreSQL where needed;
   - emits to `u:<userId>` rooms. The Redis adapter delivers it to sockets on every instance.
4. `CHAT_PARTICIPANT_REMOVED` additionally runs `socketsLeave(c:<id>)` for the removed user's sockets on all instances and sends `membership:revoked`.

**Why per-user rooms and not the conversation room?** Recipients are re-evaluated for every event, so a removed participant, a reassigned rider or an unassigned hub manager stops receiving durable content immediately, with no stale room membership. Conversation rooms are used only for ephemeral traffic and are re-authorized periodically.

## 4. Pin events (gap closed)

Phase 2 audited pins but emitted no outbox event. `ChatInteractionService.pin/unpin` now append `CHAT_MESSAGE_PINNED` / `CHAT_MESSAGE_UNPINNED` in the same transaction. They are registered in `FANOUT` (realtime) and `EVENT_TEMPLATES` (`null`). The contract test now expects 14 chat events.

## 5. Notable implementation decisions

- **Lazy Redis client creation.** Gateway `afterInit` runs before `onModuleInit`. Creating clients in `onModuleInit` left the adapter in-memory, and a test caught it. `attachAdapter` now creates clients on demand, and health requires `adapterAttached`.
- **Shutdown ordering.** Clients are quit in `onApplicationShutdown`, after Nest disposes the Socket.IO server. Quitting in `onModuleDestroy` made the adapter's `close()` unsubscribe on a closed connection, producing unhandled rejections on every graceful shutdown. A test caught this too.
- **Resilient publisher.** `@socket.io/redis-adapter` calls `pubClient.publish()` without `.catch()`. A small ioredis subclass catches and counts publish failures. The publisher uses `enableOfflineQueue: false` (no unbounded buffering) and `commandTimeout: 2000`.
- **Probe-gated fan-out.** Pub/sub can't report delivery failure, so a PING probe (default every 5 s) gates fan-out. While unhealthy, events stay in the outbox and are retried rather than silently dropped across instances.
- **Messages are sent via REST, not the socket.** This keeps one idempotency, rate-limit and validation path. The socket handles receive, typing, presence and cursors.
- **No new migration.** Ephemeral state is in Redis or memory. Cursors and outbox reuse Phase 1/2 tables.
- **Pub/sub adapter rather than the streams adapter.** Recovery is the durable REST gap-fill, not Socket.IO connection-state recovery, which would require the streams adapter.

## 6. Performance considerations

- No global broadcasts. Durable events go to the recipients' `u:` rooms; ephemeral events go to conversation rooms.
- **Per durable event:** about 6 indexed queries (conversation, participants, 4 batched scope queries, parcel), plus message hydration (1 + 2 queries) for message events. These are constant in conversation size (≤50 members).
- **Per typing event:** zero DB and zero Redis commands (in-memory rooms and timers; the broadcast goes through the adapter).
- **Presence:** writes only on connect and disconnect, plus one pipelined heartbeat per instance every 25 s (not per socket). Keys expire by TTL.
- **Room revalidation:** batched per user every 60 s (`CHAT_ROOM_REVALIDATE_MS`), about 6 queries per user with joined rooms.
- **Bounded state:** ≤25 joined rooms per socket, 64 KiB packets, per-socket token buckets, per-user handshake budget.
- **Not measured:** connection capacity, latency percentiles and memory under load. No load test was run in this phase, so no capacity claim is made. See `PHASE-3-OPERATIONS.md` §7 for the recommended load test.
