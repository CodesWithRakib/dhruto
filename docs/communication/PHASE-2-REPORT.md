# Communication Platform — Phase 2 Report

Date: 2026-11-15 · Scope: chat REST backend, authorization, tenant isolation, outbox integration, S-1 fix. **Not production-ready:** realtime delivery, uploads and UI are later phases.

## 1. Executive summary

The chat backend now works end to end over REST. Users can:

- create or retrieve conversations, list them and view detail, and manage participants;
- send messages (idempotent, with gap-free per-conversation sequences), page history in either direction, and move read/delivered cursors;
- edit and soft-delete messages, react, pin, report and search;
- if staff, list, view, export and intervene in conversations, keep internal notes, review reports and read the audit log, always with a mandatory reason and an audit record.

Every write appends a content-free event to the existing transactional outbox in the same transaction. All 12 chat event types are registered with the relay.

**S-1 is resolved.** The legacy `chat:*` socket handlers are gone, and a guard rejects any `chat:*` client event. While fixing it I caught and avoided a socket.io behaviour that would have made the guard itself a crash vector.

Verification:

- Contracts: 54 tests.
- API unit: 195.
- Chat database integration and schema: 70, against a disposable PostgreSQL 16.
- API typecheck and build pass.
- Lint is clean apart from one pre-existing error.

## 2. Repository findings (re-audit)

| Finding                                                                                                                                                                                                                | Impact                                                                                                 | Handling                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `OutboxService.append(manager, …)` writes inside the caller's transaction. `FANOUT` and `EVENT_TEMPLATES` are typed `Record<DomainEventType, …>`                                                                       | Every new event type must be registered in both                                                        | Registered all chat events (`[]` / `null`) before the first write    |
| Global `DhrutoValidationPipe` strips unknown keys (`forbidNonWhitelisted: false`)                                                                                                                                      | A client `senderId` would be silently dropped, not rejected                                            | Chat uses the strict zod contracts via `ZodValidationPipe`           |
| `HubAuthorizationService` deliberately bypasses scope for ADMIN                                                                                                                                                        | Not reusable for chat                                                                                  | Chat loads `HubUserAssignment` directly in its own policy            |
| Customers are linked to parcels only by `recipient_phone`                                                                                                                                                              | Customer eligibility is phone-based                                                                    | Normalized comparison (tolerates `+88`)                              |
| `X-Request-Id` is client-controlled; the outbox caps `requestId` at 128 chars                                                                                                                                          | An oversized header could fail sends                                                                   | Sanitized before use                                                 |
| `AuthService.onModuleInit` **seeds demo data at boot** (non-production)                                                                                                                                                | Any app boot writes to its DB                                                                          | Integration suite sets `DATABASE_URL` before import, with two guards |
| `@WebSocketServer()` with `namespace: "/"` injects a `Namespace` though typed `Server`                                                                                                                                 | Typing inaccuracy                                                                                      | Noted for Phase 3                                                    |
| **Pre-existing (environment):** from a working directory with a lowercase drive letter (`c:\…`), Node loads `@nestjs/core` twice, so **every AppModule-based e2e suite fails** ("can't resolve Reflector / ModuleRef") | Existing e2e suites could not run in this session's default cwd                                        | Root-caused (not a dependency or code issue). Run vitest from `C:\…` |
| **Pre-existing (drift):** the `Parcel` entity has `delivery_otp_code` but no migration creates it                                                                                                                      | `pnpm seed`, and parcel-based e2e suites, fail on any migrations-only database (incl. CI's `db:setup`) | Not repaired (out of scope, per instructions). Documented below      |

## 3. Files created and modified

**Created: API**

- `src/chat/`: `chat-admin.controller.ts`, `chat-conversations.controller.ts`, `chat-messages.controller.ts`, `chat.config.ts`, `chat.context.ts`, `chat-request.ts`, `chat.errors.ts`, `chat.mapper.ts`, `chat-helpers.spec.ts`
- `pipes/zod-validation.pipe.ts`
- `policies/chat-eligibility.policy.ts`, `policies/chat-eligibility.policy.spec.ts`
- `services/`: `chat-admin`, `chat-audit`, `chat-authorization`, `chat-conversation`, `chat-cursor`, `chat-events`, `chat-interaction`, `chat-message`, `chat-message-reader`, `chat-participant`, `chat-search` (`.service.ts`), plus `chat-participant-writer.ts`
- `src/database/migrations/1700000000011-CommunicationPhase2Backend.ts`
- `test/chat-phase2.e2e-spec.ts`

**Created: contracts**

- `src/chat/chat-management.schema.ts`, `src/chat/chat-admin.schema.ts`, `src/chat/chat-phase2.schema.test.ts`

**Created: docs**

- `PHASE-2-IMPLEMENTATION.md`, `PHASE-2-SECURITY-REVIEW.md`, `PHASE-2-API-REFERENCE.md`, `PHASE-2-REPORT.md`

**Modified**

| File                                                                                  | Change                                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/api/src/chat/chat.module.ts`                                                    | Controllers, services, `IntegrationsModule` import                                     |
| `apps/api/src/notifications/gateways/notifications.gateway.ts`                        | **S-1:** removed 4 chat handlers; added the `chat:*` rejection guard                   |
| `apps/api/src/integrations/outbox-relay.service.ts`                                   | 12 chat `FANOUT` entries (`[]`)                                                        |
| `apps/api/src/notifications/templates.ts` / `templates.spec.ts`                       | Chat events → `null` template; spec expects that for `chat.*`                          |
| `apps/api/src/database/entities/ChatConversation.entity.ts`, `ChatAuditLog.entity.ts` | Declare the new listing indexes                                                        |
| `apps/api/test/utils/chat-test-db.ts`, `test/chat-foundation.e2e-spec.ts`             | Include migration 0011; rollback test reverts both chat migrations                     |
| `apps/api/package.json`, `pnpm-lock.yaml`                                             | `socket.io-client@4.8.4` devDependency (already in the lockfile via web; 3 lock lines) |
| `packages/contracts/src/chat/{chat.enums,chat.schema,index}.ts`                       | New permissions and audit actions; page `senders` / `nextAfterSequence`; exports       |
| `packages/contracts/src/notifications/event.schema.ts`                                | 12 `chat.*.v1` domain events                                                           |
| `packages/contracts/src/common/api-error.schema.ts`                                   | `CHAT_*` error codes                                                                   |

**Git note:** several of these files appeared as _staged_ in the index during the session. I never ran `git add`, so this came from outside the session (for example the IDE). Nothing was committed.

## 4. REST APIs

Full catalogue: `PHASE-2-API-REFERENCE.md`. The surface is 38 routes:

- 12 conversation and participant routes;
- 8 message and cursor routes;
- 6 reaction, pin and report routes;
- 1 search route;
- 11 staff routes under `/chat/admin`.

The 8 message routes include moderator removal (`/messages/:id/remove`). The conversation routes include lifecycle actions (archive, close, reopen, lock, unlock).

## 5. Service architecture

Thin controllers delegate to focused services. `ChatAuthorizationService` is the single access decision point, wrapping the pure, unit-tested policy. The message reader returns N+1-free pages. Audit and outbox writers take the caller's transaction manager. Details: `PHASE-2-IMPLEMENTATION.md` §1.

## 6. Authorization matrix

See `PHASE-2-SECURITY-REVIEW.md` §2. The core rule: **access = ACTIVE membership AND live eligibility** (DB-derived facts, re-checked every request), or a scoped staff `ChatPermission` with a reason and an audit row. ADMIN gets nothing implicitly (verified: 404 on participant routes).

## 7. Security fixes

- **S-1 resolved:** the handlers are removed, and the guard drops and logs `chat:*` events and replies with `exception`. Tests cover: non-member gets no room and no broadcast; unauthenticated sockets are disconnected; a 50-event flood leaves the API healthy; notifications still work.
- **Guard DoS avoided:** the guard never calls `next(err)` (socket.io would re-emit it as an unhandled server-side `error`).
- **Request id sanitizing,** strict bodies, and enumeration-safe 404s.

## 8. Idempotency verification [I]

- A duplicate send returns 200, the same id, and an unchanged sequence.
- 10 concurrent identical sends: exactly one 201, one row, one outbox event, sequence +1.
- Six concurrent parcel get-or-creates produce one conversation. Merchant desk and DIRECT are idempotent.
- Reactions and pins are idempotent; duplicate reports return 409.

## 9. Sequence ordering verification

- 24 concurrent sends from 3 users produce a contiguous `head+1 … head+24` [I].
- Phase 1: 20 concurrent raw allocations produce `1…20` [S].
- An injected outbox failure rolls back the message, event and sequence; the retry succeeds [I].

## 10. Outbox integration

- 12 `chat.*.v1` events, all registered in `FANOUT` and `EVENT_TEMPLATES`.
- Events are written in the business transaction.
- Payloads carry no content (marker test).
- `pollOnce()` drains every chat event to PUBLISHED [I].
- Phase 3 adds a realtime target to the chat `FANOUT` entries (`PHASE-2-IMPLEMENTATION.md` §6).

## 11. Database query performance

Plans and query counts are in `PHASE-2-IMPLEMENTATION.md` §9:

- History, membership and idempotency are single unique-index scans. History uses a backward scan with no sort.
- Lists sort only the caller's own memberships.
- The audit timeline is index-backed.
- The search GIN index is usable; production-volume benchmarking is a Phase 6 task.

## 12. Unit test results (executed)

| Command                                                        | Result                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm --filter @dhruto/contracts test`                         | ✅ **54/54** (42 existing + 12 new)                                                  |
| `pnpm --filter @dhruto/contracts typecheck` / `lint` / `build` | ✅                                                                                   |
| `apps/api: npx vitest run src`                                 | ✅ **195/195** (171 baseline + 18 policy + 6 helper)                                 |
| `apps/api: tsc --noEmit`, `nest build`                         | ✅                                                                                   |
| `apps/api: eslint` on all changed/new files                    | ✅ clean                                                                             |
| `apps/api: pnpm lint`                                          | ❌ 1 error, **pre-existing** `src/main.ts:90` (unchanged since the Phase 1 baseline) |
| `apps/web-merchant: pnpm typecheck`                            | ✅                                                                                   |

## 13. Integration test results (executed, disposable `postgres:16-alpine`)

| Suite                                                                                              | Result       |
| -------------------------------------------------------------------------------------------------- | ------------ |
| `test/chat-phase2.e2e-spec.ts` (full AppModule over HTTP + Socket.IO)                              | ✅ **38/38** |
| `test/chat-foundation.e2e-spec.ts` (schema, constraints, zero drift, migration down/up incl. 0011) | ✅ **32/32** |
| Compiled CLI on an empty schema: `migrate-cli run` → 12 migrations applied, `show` → none pending  | ✅           |

Coverage of the 20 required scenarios:

1. Create conversation.
2. Add valid participants.
3. Reject invalid participants.
4. Send a message.
5. History.
6. Duplicate request.
7. Concurrent idempotent sends.
8. Concurrent ordering.
9. Edit.
10. Delete.
11. Reaction.
12. Read.
13. Delivered.
14. Admin intervention.
15. Internal-note isolation.
16. Outbox rollback.
17. Unauthorized merchant access.
18. Unauthorized rider access (including reassignment).
19. Unauthorized hub access.
20. Legacy WebSocket rejection.

All 20 are covered.

**Existing e2e regression (subset):** run against the disposable DB, migrated and partially seeded, from `C:\`. Result: **16 passed, 4 failed, 10 skipped** across 7 suites.

- **Passed:** observability (6), auth-rate-limit (3), notifications-webhooks (7 of 9).
- **Failed, all pre-existing and unrelated to chat:**
  - auth-guards, validation-hardening, notifications #7 and both rate-limit suites fail with HTTP 500 from `column "delivery_otp_code" of relation "parcels" does not exist` (drift).
  - notifications #2 expects `+8801712345678` but gets `8801712345678` (SMS formatting; recent SMS provider commits).
- **Not run:** the parcel, hub, finance, intelligence, analytics and rider suites. They need the full seed, which the drift blocks on a migrations-only DB, and I didn't run them against your seeded development database.

## 14. Security regression results

Every role was tested on both allowed and denied paths:

- **ADMIN:** denied implicitly; allowed with reason.
- **HUB_MANAGER:** own hub allowed; other hub denied; no view-any.
- **RIDER:** assigned allowed; unassigned or reassigned denied.
- **MERCHANT:** own allowed; other merchant denied.
- **CUSTOMER:** recipient allowed; others denied.

DIRECT/GROUP are denied to merchants and customers. Strict-body rejection and the S-1 socket tests are included. See `PHASE-2-SECURITY-REVIEW.md`.

## 15. Known limitations

1. **Attachments:** the validation path is implemented, but no upload API exists yet (S3 phase), so IMAGE/FILE/VOICE sends cannot be completed by clients.
2. **Search:** whole-word full-text only (`simple` config, no prefix or fuzzy matching, no conversation-title search). Plan choice is statistics-driven, so benchmark at volume (Phase 6).
3. **Unread counts** include messages deleted after being sent.
4. **User conversation list** can return fewer than `limit` items when live eligibility filters rows; cursor and `hasMore` stay correct.
5. **Reassigned riders** keep an ACTIVE row (access is denied live). The Phase 5 workflow should mark them REMOVED.
6. **Deleted content** is retained in `chat_message_edits` for moderation. A retention policy is needed before go-live.
7. **Read/delivered events** are written per cursor advance; batching may be needed at scale.
8. **No SUPERADMIN;** ADMIN holds every chat permission. No per-participant permission overrides.
9. **Pre-existing, unrelated, not fixed:**
   - `main.ts:90` lint error;
   - `delivery_otp_code` drift (blocks `pnpm seed` and parcel e2e on migrations-only DBs, including CI);
   - SMS formatting test failure;
   - lowercase-drive cwd breaks vitest e2e on Windows.
10. **Migrations 0010 and 0011** are not applied to dev or shared environments (awaiting approval and a verified backup).

## 16. Phase 3 readiness

Phase 3 can build on:

- outbox events with stable ids and sequences;
- the `ChatAuthorizationService.requireMember` check, exported from `ChatModule`, for socket room joins;
- the gap-fill API (`afterSequence`);
- cursor endpoints for multi-device sync.

Phase 3 must:

1. add a realtime `FanoutTarget` for `chat.*` events;
2. build the membership-checked gateway with the Redis adapter;
3. fix gateway CORS (S-2) and the `Server`/`Namespace` typing;
4. remove the unused web `chat:*` socket helpers when the UI lands.

## 17. Status

**COMPLETE WITH DOCUMENTED LIMITATIONS**

All Phase 2 functionality and the S-1 fix are implemented and verified against a disposable database. The limitations are the pre-existing environment and drift issues above, the deferred upload, realtime and UI phases, and migrations deliberately not applied to shared databases.
