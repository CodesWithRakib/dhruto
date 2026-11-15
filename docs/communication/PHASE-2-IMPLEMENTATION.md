# Communication Platform — Phase 2 Implementation

Phase 2 delivers the database-backed chat backend over REST: authorization, conversations, participants, messages, cursors, reactions, pins, reports, search, staff tooling, audit and outbox events. It also resolves the S-1 legacy WebSocket issue. The route catalogue is in `PHASE-2-API-REFERENCE.md` and the controls in `PHASE-2-SECURITY-REVIEW.md`.

## 1. Module structure (`apps/api/src/chat/`)

```
chat.module.ts                    entities + controllers + services; imports IntegrationsModule (OutboxService)
chat-conversations.controller.ts  /chat/conversations (+ participants, lifecycle)
chat-messages.controller.ts       messages, cursors, reactions, pins, reports, search
chat-admin.controller.ts          /chat/admin/* (staff)
chat.config.ts                    rate limits, edit window (env-configurable)
chat.context.ts / chat-request.ts request context from CurrentUser; X-Request-Id sanitizing
chat.errors.ts                    error factories → stable ApiErrorCode values
chat.mapper.ts                    the only entity → contract mapping (prevents field leaks)
pipes/zod-validation.pipe.ts      validates with the shared zod contracts → standard 422
policies/chat-eligibility.policy.ts  pure authorization policy (unit-tested per role)
services/
  chat-authorization.service.ts   loads scope facts; requireMember / resolveAccess / requireStaff
  chat-conversation.service.ts    get-or-create, list, detail, title, lifecycle
  chat-participant.service.ts     list / add / leave / remove
  chat-participant-writer.ts      shared membership writes (insert-or-ignore, ensureMembership)
  chat-message.service.ts         send (idempotent), history, get, edit, delete, moderator remove, system messages
  chat-message-reader.service.ts  N+1-free pages (attachments, reactions, senders, participants)
  chat-cursor.service.ts          read / delivered cursors
  chat-interaction.service.ts     reactions, pins, reports
  chat-search.service.ts          PostgreSQL full-text search
  chat-admin.service.ts           staff list/view/export/intervene, notes, reports, audit log
  chat-audit.service.ts           chat_audit_logs writer (same transaction as the action)
  chat-events.service.ts          event_outbox writer (same transaction as the action)
```

Controllers are thin: they build the context, validate, and delegate. There are no circular dependencies. `ChatAdminService` depends on the message and conversation services; nothing depends back on it.

**Validation decision.** The rest of the API uses class-validator DTOs. The chat request contracts already existed as strict zod schemas in `@dhruto/contracts`, so chat validates with those through `ZodValidationPipe`, which emits the same `422 VALIDATION_ERROR` envelope. This avoids a second definition that could drift. It also rejects unknown keys, whereas the global pipe silently strips them.

## 2. Idempotency and sequence algorithm

`ChatMessageService.send`, in one transaction:

1. `requireMember` (membership + live eligibility + SEND capability + writable).
2. Look up `(conversation_id, sender_user_id, client_message_id)`. If found, return it (`200`, no counter change).
3. `SELECT … FROM chat_conversations … FOR UPDATE`, which serializes senders per conversation.
4. Re-check the key under the lock. This catches a concurrent retry that committed while we waited.
5. Validate the reply target (same conversation) and attachments (locked `FOR UPDATE`).
6. `sequence = last_message_sequence + 1`. Insert the message, link attachments, update the conversation head (sequence, last id, time, preview).
7. Advance the sender's own read and delivered cursors with `GREATEST`.
8. `OutboxService.append(manager, CHAT_MESSAGE_CREATED)` inside the same transaction.

**Backstop:** if the unique index `UQ_chat_messages_conversation_sender_client` still rejects an insert, the whole transaction rolls back (sequence bump and outbox row included) and the canonical row is returned.

**Verified [I]:**

- A duplicate request returns 200 with the same id and an unchanged sequence.
- 10 concurrent identical sends produce exactly one 201, one row, one outbox event and a +1 sequence.
- 24 concurrent distinct sends from 3 users produce a gap-free run.
- An injected outbox failure leaves no message, no event and an unchanged sequence, and the same `clientMessageId` then succeeds.

System messages (staff intervention) allocate sequences through the same locked path.

## 3. Conversation get-or-create

- **PARCEL_DELIVERY:** `INSERT … ON CONFLICT ("parcel_id") WHERE type='PARCEL_DELIVERY' DO NOTHING` on the Phase 1 partial unique index. Six concurrent creates produce one conversation [I]. Callers who join later (for example a newly assigned rider) are added on their own get-or-create call.
- **MERCHANT_DESK / DIRECT:** a transaction-scoped `pg_advisory_xact_lock(hashtextextended(key))` keyed by the merchant, or the sorted user pair, then select-or-insert.
- **Re-joining:** a user who LEFT is reactivated. A user REMOVED by a moderator is **not** re-admitted by get-or-create (403); only a moderator or staff can re-add them.

## 4. Pagination

- **History:** keyset on `UQ_chat_messages_conversation_sequence`. `beforeSequence` (or none) scans backwards for the newest N; `afterSequence` scans forwards for gap fill. Pages are returned in chronological order, with `hasMore`, `nextBeforeSequence`, `nextAfterSequence` and `senders`. Limit 1–100, default 50. No OFFSET anywhere.
- **Conversation lists** (user and admin), **reports** and the **audit log:** opaque base64url keyset cursors over `(sort timestamp text, id)`. The timestamp is carried as full-precision text to avoid millisecond truncation.
- **List eligibility:** the user list filters page rows by live eligibility in one batched parcel query, so a page can contain fewer than `limit` items while `hasMore` and the cursor stay correct.

## 5. Read and delivery cursors

There is one atomic `UPDATE chat_participants … WHERE <cursor> < $seq AND $seq <= (SELECT last_message_sequence …) RETURNING`:

- **Monotonic:** backward requests are no-ops returning the current state.
- **Bounded:** a sequence beyond the head is rejected with 422.
- **Read implies delivered:** `GREATEST` on delivered.
- **Events only on advance:** `CHAT_MESSAGE_READ` / `CHAT_MESSAGE_DELIVERED` are written only when the cursor actually moved.
- **Unread** = `max(0, head − last_read)`, computed with BigInt. There is no per-message receipt table.

**Multi-device synchronization (Phase 3 design).** Cursors are per _user_, not per device, so any device advancing them updates all of them. Phase 3 fans out `CHAT_MESSAGE_READ` / `CHAT_MESSAGE_DELIVERED` from the outbox to the user's own `user:<id>` room, so other tabs and devices update their badges. On reconnect, a client calls `GET …/messages?afterSequence=<last seen>` to fill gaps (sequences make gaps detectable), then posts `delivered` with the head. The server never moves a cursor backwards, so racing devices cannot regress state.

## 6. Outbox integration

- **No new outbox table.** Twelve events were added to `DomainEventType` following the `x.y.v1` convention: `chat.conversation_created`, `participant_added`, `participant_removed`, `message_created`, `message_edited`, `message_deleted`, `message_reacted` (with `action: added|removed`), `message_read`, `message_delivered`, `conversation_archived`, `conversation_closed`, and `conversation_status_changed` (lock/unlock/reopen).
- **Registered before the first write.** Each event has an entry in `OutboxRelayService.FANOUT` (currently `[]`) and `EVENT_TEMPLATES` (`null`). The relay therefore processes them: with no targets, rows go to PUBLISHED. An integration test drains the relay and asserts no chat event is left un-PUBLISHED.
- **Payloads** are `aggregate_type = 'chat_conversation'`, `aggregate_id = conversation id`, carrying ids, sequences, types and statuses only. **Never content.**
- **Phase 3 integration point:** add a realtime `FanoutTarget` kind (for example `chat-realtime`) to the chat entries in `FANOUT`. Its handler loads the authoritative rows by id (for example the message by `messageId`) and emits to the membership-checked conversation room through the new gateway and Redis adapter. Because payloads carry no content, a fan-out can never leak more than the database currently allows.
- `templates.spec.ts` was updated to expect `null` templates for `chat.*` events. Its assertion for all non-chat events is unchanged.

## 7. Configuration

| Variable                               | Default | Meaning                           |
| -------------------------------------- | ------- | --------------------------------- |
| `CHAT_RATE_LIMIT_SEND_PER_MIN`         | 60      | Message sends per user per minute |
| `CHAT_RATE_LIMIT_CREATE_PER_MIN`       | 20      | Conversation creates              |
| `CHAT_RATE_LIMIT_REACT_PER_MIN`        | 120     | Reaction add/remove               |
| `CHAT_RATE_LIMIT_REPORT_PER_MIN`       | 10      | Reports                           |
| `CHAT_RATE_LIMIT_SEARCH_PER_MIN`       | 30      | Searches                          |
| `CHAT_RATE_LIMIT_PARTICIPANTS_PER_MIN` | 30      | Participant changes               |
| `CHAT_RATE_LIMIT_CURSOR_PER_MIN`       | 240     | Read/delivered updates            |
| `CHAT_RATE_LIMIT_MUTATE_PER_MIN`       | 60      | Edit/delete/pin/status            |
| `CHAT_RATE_LIMIT_READ_PER_MIN`         | 300     | Reads                             |
| `CHAT_RATE_LIMIT_ADMIN_PER_MIN`        | 120     | Staff routes                      |
| `CHAT_MESSAGE_EDIT_WINDOW_SECONDS`     | 900     | Edit window; `0` disables editing |

## 8. Database changes

Migration `1700000000011-CommunicationPhase2Backend` is additive and idempotent:

- Three audit actions (`ADMIN_CONVERSATIONS_LISTED`, `ADMIN_CONVERSATION_EXPORTED`, `AUDIT_LOG_VIEWED`).
- A GIN full-text index `IDX_chat_messages_content_fts` (`to_tsvector('simple', …)`, partial on `deleted_at IS NULL`).
- Listing indexes `IDX_chat_conversations_created`, `…_merchant_created` and `…_hub_created`, plus `IDX_chat_audit_logs_created`.

`down` drops the indexes. PostgreSQL cannot drop enum values, so those remain and are harmless. Entities declare the B-tree indexes, and drift on chat tables remains **zero** [S]. The expression GIN index is invisible to TypeORM's diff by design.

**Not applied** to the development database or any shared environment.

## 9. Performance findings

Query plans were captured on the disposable DB with `enable_seqscan = off`, so index choice is visible on small data:

| Path               | Plan                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History page       | `Index Scan Backward using UQ_chat_messages_conversation_sequence` — no Sort                                                                                      |
| Membership check   | `Index Scan using UQ_chat_participants_conversation_user`                                                                                                         |
| Idempotency lookup | `Index Scan using UQ_chat_messages_conversation_sender_client`                                                                                                    |
| Conversation list  | `IDX_chat_participants_user_active` → PK join → Sort over the caller's own memberships (bounded, by design)                                                       |
| Search             | GIN `IDX_chat_messages_content_fts` usable (verified). On tiny data the planner preferred membership-first with FTS as a filter; plan choice is statistics-driven |
| Audit timeline     | `Index Scan Backward using IDX_chat_audit_logs_created`                                                                                                           |

**Query counts (fixed, independent of data size):**

- **Send:** about 12–16 statements in one transaction. Authorization loads (user, role facts, conversation, participant, parcel) account for about 5; the rest is idempotency ×2, lock, insert, head update, cursor update, outbox insert, and hydration ×2.
- **History page:** authorization (~5) + 4.
- **Conversation list:** authorization (~2) + 5.

No network calls are made while locks are held. The outbox relay runs after commit.

## 10. Running the tests

```bash
# Contracts
pnpm --filter @dhruto/contracts test

# API unit tests
cd apps/api && npx vitest run src

# Chat DB suites (disposable PostgreSQL only)
docker run -d --rm --name dhruto-chat-testdb -e POSTGRES_PASSWORD=testpw \
  -e POSTGRES_DB=dhruto_chat_test -p 127.0.0.1:55499:5432 postgres:16-alpine
CHAT_TEST_DATABASE_URL=postgresql://postgres:testpw@127.0.0.1:55499/dhruto_chat_test \
  npx vitest run test/chat-foundation.e2e-spec.ts test/chat-phase2.e2e-spec.ts
```

**Windows note.** Run vitest from a working directory with an **uppercase drive letter** (`C:\…`). From `c:\…`, Node loads `@nestjs/core` twice (two module-cache keys), and every AppModule-based e2e suite fails with "can't resolve Reflector/ModuleRef" (see `PHASE-2-REPORT.md` §2).

`test/chat-phase2.e2e-spec.ts` sets `DATABASE_URL` in `vi.hoisted`, before AppModule is imported, because `AuthService` seeds demo data at boot. It refuses to boot unless that matches `CHAT_TEST_DATABASE_URL`, and aborts if the live database name lacks `test`.
