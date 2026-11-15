# Communication Platform — Phase 3 Report

Date: 2026-11-15 · Scope: realtime messaging engine (authenticated `/chat` gateway, outbox-to-socket fan-out, Redis adapter, presence, typing, cursor sync, S-2). **Not production-ready:** no load test, no frontend, issuer/audience not enforced platform-wide.

## 1. Summary of implemented features

- **Authenticated `/chat` namespace.** The handshake uses the existing `CustomJwtService` with a mandatory `exp`. The user is reloaded from PostgreSQL (inactive accounts rejected), client identity fields are ignored, and the session closes when the token expires.
- **Server-controlled rooms.** `u:<user>` is joined on connect. `c:<conversation>` is joined only after `ChatAuthorizationService.requireMember`, re-authorized every 60 s, and revoked on removal across instances.
- **Durable fan-out** through the existing relay. A new `chat-realtime` `FanoutTarget` covers all 14 `chat.*.v1` events. It runs only for committed rows, emits only to currently eligible participants, loads content from PostgreSQL (payloads stay content-free), throws to retry while Redis distribution is unhealthy, and is idempotent (stable `eventId`).
- **Redis Socket.IO adapter** for horizontal scaling. It reuses the existing Redis configuration, connects without blocking startup, reconnects with backoff, gates fan-out on a PING probe, never produces unhandled publish rejections, and shuts down gracefully.
- **Presence** in Redis: multi-device reference counting, TTL expiry, atomic transitions, an in-memory fallback, and visibility limited to shared, joined conversations.
- **Typing indicators:** in memory, throttled, auto-expiring, cleaned up on leave, revoke and disconnect.
- **Cursor sync** via socket `cursor:read` / `cursor:delivered` (same service as REST), plus `cursor:updated` to all devices.
- **Reconnect/recovery protocol** documented for Phase 4: rejoin, compare head, REST `afterSequence` gap-fill, `eventId` dedupe.
- **S-2 resolved:** env-driven origin allowlist enforced on every handshake (including WebSocket upgrades), no wildcard, production fails closed. Gateway `Server`/`Namespace` typing fixed.
- **Operations:** `/health/realtime`, realtime in readiness, structured lifecycle logs, per-instance counters, rate limits, 64 KiB packet cap.
- **Gap closed from Phase 2:** pin/unpin now emit outbox events.

## 2. Architecture and event flow

REST write → `COMMIT` (message + `event_outbox`) → relay claims the row → `REALTIME_FANOUT_HANDLER` → recipients = ACTIVE ∩ eligible → DB-loaded payload → `nsp.to(u:<id>…)` → Redis adapter → sockets on every instance. Ephemeral typing and presence go to `c:` rooms only.

Details: `PHASE-3-IMPLEMENTATION.md` §3, `PHASE-3-REALTIME-PROTOCOL.md` §6. Semantics are **at-least-once, best-effort** (not exactly-once). PostgreSQL plus REST gap-fill are the source of truth.

## 3. Security fixes and remaining risks

**Fixed:**

- **S-2:** CORS and Origin.
- **Typing inaccuracy:** gateway server typed `Namespace`.
- **Expiry:** sockets require `exp` and disconnect at token expiry.

**Found and fixed during implementation, both caught by the new tests:**

1. **The adapter silently stayed in-memory.** Nest runs gateway `afterInit` before `onModuleInit`, so cross-instance delivery was broken, and the fan-out health check would have passed anyway. Now clients are created lazily, and health requires the adapter to be attached.
2. **Unhandled Redis rejections on every graceful shutdown.** The clients were quit before Nest closed the Socket.IO server. Now they are quit in `onApplicationShutdown`.

S-1 protections are unchanged and still tested.

**Remaining:** no issuer/audience claims (platform-wide); a ≤60 s ephemeral revocation window for eligibility changes without a chat event; a pub/sub loss window up to the probe interval; production Redis must use TLS and auth; no load test. See `PHASE-3-SECURITY-REVIEW.md` §7.

## 4. Files created and modified

**Created: API**

- `src/chat/realtime/`: `chat.gateway.ts`, `chat-socket-auth.ts`, `chat-realtime-fanout.service.ts`, `chat-redis.service.ts`, `chat-presence.service.ts`, `chat-typing.tracker.ts`, `token-bucket.ts`, `chat-realtime-metrics.service.ts`, `chat-socket-server.ts`, `chat-rooms.ts`, `chat-realtime.config.ts`, `chat-realtime.module.ts`, `realtime-units.spec.ts`
- `src/common/websocket/socket-server.options.ts`
- `src/integrations/realtime-fanout.port.ts`
- `test/chat-realtime.e2e-spec.ts`, `test/utils/chat-fixtures.ts`

**Created: contracts**

- `src/chat/chat-realtime.schema.ts`, `src/chat/chat-realtime.schema.test.ts`

**Created: docs**

- `PHASE-3-IMPLEMENTATION.md`, `PHASE-3-REALTIME-PROTOCOL.md`, `PHASE-3-SECURITY-REVIEW.md`, `PHASE-3-OPERATIONS.md`, `PHASE-3-REPORT.md`
- ADR-022…026 appended to `ARCHITECTURE-DECISIONS.md`

**Modified**

| File                                                                    | Change                                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/api/src/app.module.ts`                                            | Register `ChatRealtimeModule`                                                                |
| `apps/api/src/chat/chat.module.ts`                                      | Export `ChatCursorService`, `ChatMessageReaderService`                                       |
| `apps/api/src/chat/services/chat-authorization.service.ts`              | `eligibleRecipientIds`, `accessibleConversationIds` (batched)                                |
| `apps/api/src/chat/services/chat-interaction.service.ts`                | Pin/unpin outbox events                                                                      |
| `apps/api/src/integrations/outbox-relay.service.ts`                     | `chat-realtime` target + optional injected handler                                           |
| `apps/api/src/notifications/gateways/notifications.gateway.ts`          | Shared server options (S-2), `Namespace` typing. **S-1 guard untouched**                     |
| `apps/api/src/notifications/templates.ts`                               | `null` templates for the 2 pin events                                                        |
| `apps/api/src/health/health.controller.ts`                              | Realtime readiness + `GET /health/realtime`                                                  |
| `apps/api/test/chat-phase2.e2e-spec.ts`                                 | Use the disposable Redis when `CHAT_TEST_REDIS_URL` is set (keeps tests off developer Redis) |
| `packages/contracts/src/chat/index.ts`, `notifications/event.schema.ts` | Realtime exports; `chat.message_pinned.v1` / `chat.message_unpinned.v1`                      |
| `packages/contracts/src/chat/chat-phase2.schema.test.ts`                | Expected chat event count 12 → 14 (two new events)                                           |
| `apps/api/package.json`, `pnpm-lock.yaml`                               | `@socket.io/redis-adapter@8.3.0` (44 lock lines)                                             |

**Git:** nothing committed and no `git add` run by me. As in Phase 2, several files appeared as _staged_ in the index during the session from outside this session (likely the IDE).

## 5. Exact test results

**Executed and passed**

| Command                                                                                                                 | Result                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `pnpm --filter @dhruto/contracts test`                                                                                  | ✅ 58/58 (54 + 4 new)                    |
| contracts `typecheck` / `lint` / `build`                                                                                | ✅                                       |
| `apps/api: npx vitest run src`                                                                                          | ✅ 204/204 (195 + 9 new)                 |
| `apps/api: tsc --noEmit` / `nest build`                                                                                 | ✅ / ✅                                  |
| `apps/api: eslint` on all changed/new files                                                                             | ✅ 0 problems                            |
| `apps/web-merchant: pnpm typecheck`                                                                                     | ✅                                       |
| `test/chat-realtime.e2e-spec.ts` (2 app instances, disposable PostgreSQL 16 + Redis, real `docker stop`/`start` outage) | ✅ **22/22**, exit 0, 0 unhandled errors |
| `test/chat-phase2.e2e-spec.ts` (incl. S-1 legacy tests)                                                                 | ✅ 38/38                                 |
| `test/chat-foundation.e2e-spec.ts` (schema, zero drift, migration down/up)                                              | ✅ 32/32                                 |
| Existing regression subset: observability, auth-rate-limit, notifications-webhooks                                      | ✅ 16 passed                             |

Phase 3 coverage:

| Area           | Tests                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication | valid JWT · missing · tampered · expired · refresh-as-access · suspended · identity spoofing · untrusted origin · rejected-handshake flood                                                                                      |
| Authorization  | member join · non-member / other merchant / other hub / unassigned rider / admin without intervention · arbitrary and `u:` rooms · removed participant · reassigned rider · admin after intervention                            |
| Events         | cross-instance `message:new` to authorized users only · edit/reaction/pin/delete scoping · cursor multi-device sync and authorization · typing throttle and expiry · disconnect cleanup · presence multi-device and visibility  |
| Delivery       | rollback → no event · duplicate processing (same `eventId`, no side effects) · reconnect gap-fill · Redis outage (REST unaffected, outbox row retryable, readiness not "ready", cross-instance delivery resumes, row PUBLISHED) |
| Abuse          | event flood (rate-limited then disconnected, API responsive) · oversized packet                                                                                                                                                 |

**Executed and failed (pre-existing, unrelated, unchanged from Phase 2)**

- `pnpm lint` (repo-wide): 1 error at `src/main.ts:90` (`no-explicit-any`).
- notifications-webhooks #2: SMS number format (`8801…` vs `+8801…`).
- notifications-webhooks #7: `delivery_otp_code` schema drift (HTTP 500 on parcel insert).

**Not executed**

- Load or soak tests (capacity unverified).
- Existing e2e suites that need the full seed (parcels, hubs, finance, intelligence, analytics, riders), which the pre-existing `delivery_otp_code` drift blocks on migrations-only databases.
- Playwright.

**Environment notes**

- On Windows, vitest e2e must run from an uppercase-drive working directory (`C:\…`). See the Phase 2 report.
- Tests use disposable containers (`postgres:16-alpine`, `redis:alpine`), removed afterwards. Migrations were **not** applied to any shared or development database.

## 6. Environment variables and deployment dependencies

- New runtime dependency: `@socket.io/redis-adapter`.
- No new infrastructure: realtime uses the existing Redis with 2 extra connections per instance.
- Production must set `WS_CORS_ORIGINS` (or `CORS_ORIGIN`) and use TLS Redis.
- Realtime tunables: `CHAT_REALTIME_*`, `CHAT_PRESENCE_*`, `CHAT_ROOM_REVALIDATE_MS`, `CHAT_SOCKET_*`. Full table: `PHASE-3-OPERATIONS.md` §2.
- The load balancer must allow WebSocket upgrades. Sticky sessions are needed only if polling fallback is used.

## 7. Known limitations

1. **No load test:** connection capacity and latency percentiles are unmeasured. The design avoids global broadcasts and per-heartbeat DB writes.
2. **Delivery is at-least-once, best-effort.** Clients must implement the recovery protocol (§10 of the protocol doc).
3. **Ephemeral revocation window:** ≤ `CHAT_ROOM_REVALIDATE_MS` for eligibility changes that emit no chat event. Durable content is filtered per event.
4. **Fan-out query cost:** about 6 queries per durable event and about 6 per user per revalidation tick. Fine for the expected group sizes (≤50), but measure at scale.
5. **Retries while the gateway is absent:** a process without a gateway (migrate or seed CLI contexts) that claims chat outbox rows fails those attempts, and they are retried later by API instances.
6. **Presence on Redis outage** degrades to per-instance.
7. **Issuer/audience** are not part of the platform JWT.
8. **Unused web `chat:*` helpers** remain; they are rejected server-side.
9. **Migrations 0010/0011** are not applied to shared or dev environments (unchanged).

## 8. Phase 1 and Phase 2 integrity

All Phase 1 (32) and Phase 2 (38, including S-1) integration tests and all 195 previous unit tests still pass. REST endpoints, contracts and the outbox are backward compatible. The relay processes chat events through the new target, and non-chat fan-out is unchanged.

## 9. Phase 4 readiness

**Phase 4 (web messenger UI) can begin.** It should implement the client protocol exactly as specified:

- reconnect with backoff;
- rejoin focused conversations;
- head comparison and `afterSequence` gap-fill;
- `eventId` / `message.id` dedupe;
- local typing expiry;
- cursor events.

It should also remove the legacy `chat:*` helpers in `use-notification-socket.ts`. Before production: a load test, TLS Redis, `WS_CORS_ORIGINS`, and applying migrations 0010/0011 after a verified backup.

## 10. Status

**COMPLETE WITH DOCUMENTED LIMITATIONS**
