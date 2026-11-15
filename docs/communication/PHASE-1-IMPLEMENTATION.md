# Communication Platform — Phase 1 Implementation Guide

Phase 1 delivers the **domain model, database foundation, shared contracts, and security policy**. It exposes no runtime chat behaviour: no controllers, services, gateways, workers, or UI.

## 1. Domain model

### Conversation types

| Type                  | Scope (DB-enforced)                | Typical participants                                                             |
| --------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| `PARCEL_DELIVERY`     | parcel + merchant (one per parcel) | merchant user, assigned rider, recipient customer (if registered), ops observers |
| `SUPPORT_TICKET`      | optional parcel/merchant           | requester + support staff                                                        |
| `HUB_OPERATIONS`      | hub                                | hub manager(s), riders of that hub                                               |
| `MERCHANT_DESK`       | merchant                           | merchant users + account staff                                                   |
| `INTERNAL_SUPERVISOR` | none                               | staff only (never merchants/customers; enforced by Phase 2 creation policy)      |
| `DIRECT`              | none                               | exactly two users (enforced by Phase 2 creation policy)                          |
| `GROUP`               | none                               | creator-selected users                                                           |

All values were checked against the existing workflows (parcels, hubs, riders, merchants) and the five platform roles. None duplicates an existing enum.

### Lifecycle

```
            ┌──────────── reopen ────────────┐
            ▼                                │
 ACTIVE ──► ARCHIVED ──► CLOSED ─────────────┘
   │  ▲        │  ▲        │
   │  └────────┘  └────────┤
   ▼                       ▼
 LOCKED ◄──────────────────┘   (LOCKED → ACTIVE | CLOSED only)
```

The exact rules are in `CHAT_CONVERSATION_TRANSITIONS` (contracts):

- ACTIVE → ARCHIVED | CLOSED | LOCKED
- ARCHIVED → ACTIVE | CLOSED | LOCKED
- CLOSED → ACTIVE | ARCHIVED | LOCKED
- LOCKED → ACTIVE | CLOSED
- Identity transitions are rejected.
- Entering or leaving LOCKED requires `ChatPermission.CONVERSATION_MODERATE` (`transitionRequiresModeration`).
- Other transitions require the `CHANGE_STATUS` participant capability (OWNER/MODERATOR) or the moderate permission.
- Only ACTIVE conversations accept messages, reactions, edits, or new pins (`isConversationWritable`).
- On entering a status, the service sets its timestamp (`archived_at` / `closed_at` / `locked_at`). A CHECK guarantees the timestamp exists.
- Every transition writes `CONVERSATION_STATUS_CHANGED` to the audit log with `{ from, to }`.

### Participant policy

| Participant role | Capabilities                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| OWNER, MODERATOR | READ, SEND, REACT, EDIT/DELETE own, REPORT, PIN, MANAGE_PARTICIPANTS, CHANGE_STATUS, REMOVE_ANY_MESSAGE |
| MEMBER           | READ, SEND, REACT, EDIT/DELETE own, REPORT                                                              |
| OBSERVER         | READ, REPORT                                                                                            |

Non-ACTIVE memberships (LEFT/REMOVED) have no capabilities. Removed or left participants keep no read access. Phase 2 decides whether they may read history up to `left_at`, and the default is **no**.

### Message types

`TEXT`, `IMAGE`, `FILE`, `LOCATION`, `VOICE`, `SYSTEM_EVENT` (server-only), `QUICK_ACTION`. Per-type request validation is in `sendChatMessageSchema`.

## 2. Security architecture

1. **Identity**: the JWT (`JwtAuthGuard` for HTTP, handshake verification for sockets). The sender is always `request.user.id`, never a body field (contracts reject unknown keys such as `senderId`).
2. **Conversation authorization** is checked on every operation:
   `ACTIVE participant row for (conversation_id, user.id)` **or** `staff ChatPermission` (+ audit).
   A client-supplied `conversationId`, `hubId`, `merchantId`, or `parcelId` is never proof of access.
3. **Tenant isolation**: conversation creation validates scope ownership server-side. A merchant can only create or join conversations whose `merchant_id` matches its JWT `merchantId`. Hub-scoped staff access requires an active `HubUserAssignment` for `hub_id`. Riders join `PARCEL_DELIVERY` only while assigned to the parcel.
4. **Role-based access**: platform roles are a ceiling (`ROLE_CHAT_PERMISSIONS`). Participant roles govern in-conversation actions.
5. **Admin separation**: ADMIN does **not** implicitly read conversations. Reading a conversation one is not part of requires `CONVERSATION_VIEW_ANY`. Joining or posting into it requires `CONVERSATION_INTERVENE`. Both demand a reason and write `ADMIN_CONVERSATION_VIEWED` / `ADMIN_INTERVENTION` (DB CHECK requires the reason). An intervening admin is added as a visible participant, so others can see staff joined.
6. **Internal notes**: separate table and separate endpoints, `INTERNAL_NOTE_MANAGE` only. Notes are never part of message payloads or socket events.
7. **Audit trail**: lifecycle, membership, moderation, pins, report resolution, note create/delete, attachment rejection, and admin access. The table is append-only (trigger).
8. **Sensitive data**: participant payloads expose `displayName` and `platformRole` only, never phone or email. `storage_key` is never exposed (downloads will use short-lived signed URLs). Previews of deleted messages are cleared. Audit metadata must be secret-free and PII-minimal.
9. **Safe metadata**: strict per-type zod schemas, jsonb object CHECK, scalar-only system params, filename sanitisation, and a MIME allow-list.
10. **Abuse protection** (Phase 2/3): per-user send rate limits via the existing `@RateLimit` guard and Redis, payload size bounds from contracts, and a duplicate-report guard (unique index).

**Known current risk:** the placeholder `chat:*` handlers in `NotificationsGateway` bypass all of the above (audit S-1). Phase 3 must remove or replace them.

## 3. Shared contracts (`@dhruto/contracts`)

`packages/contracts/src/chat/`:

- `chat.enums.ts`: `ChatConversationType`, `ChatConversationStatus`, `ChatMessageType`, `ChatParticipantRole`, `ChatParticipantStatus`, `ChatNotificationLevel`, `ChatMessageDeliveryStatus`, `ChatAttachmentStatus`, `ChatReportReason`, `ChatReportStatus`, `ChatAuditAction`, `ChatPermission`
- `chat.policy.ts`: `CHAT_CONVERSATION_TRANSITIONS`, `canTransitionConversation`, `transitionRequiresModeration`, `isConversationWritable`, `CHAT_CONVERSATION_SCOPE_REQUIREMENTS`, `ChatParticipantCapability`, `CHAT_PARTICIPANT_ROLE_CAPABILITIES`, `participantHasCapability`
- `chat.schema.ts`: limits (`CHAT_MESSAGE_MAX_LENGTH`, page limits, attachment limits, MIME allow-list), `chatSequenceSchema`, metadata schemas, request schemas (`sendChatMessageSchema`, `listChatMessagesQuerySchema`, `listChatConversationsQuerySchema`, `markChatReadSchema`, `updateChatParticipantPreferencesSchema`, `createChatAttachmentSchema`, `reportChatMessageSchema`, `chatReactionSchema`), response types (`ChatMessageItem`, `ChatMessagePage`, `ChatConversationSummary`, `ChatConversationDetail`, `ChatConversationPage`, `ChatParticipantItem`, `ChatMyParticipation`, `ChatAttachmentItem`, `ChatReactionSummary`, `ChatLastMessagePreview`, `ChatInternalNoteItem` — staff-only), and `computeChatUnreadCount`

These contracts describe API boundaries, not entities. Platform roles are not redefined. `platformRole` is a string, and the authoritative `UserRole` stays in the API.

## 4. Running the tests

```bash
# Contracts (pure)
pnpm --filter @dhruto/contracts test

# API unit tests (includes chat-permissions.spec.ts)
cd apps/api && npx vitest run src

# Schema / migration tests: disposable PostgreSQL ONLY
docker run -d --rm --name dhruto-chat-testdb \
  -e POSTGRES_PASSWORD=testpw -e POSTGRES_DB=dhruto_chat_test \
  -p 127.0.0.1:55499:5432 postgres:16-alpine
CHAT_TEST_DATABASE_URL=postgresql://postgres:testpw@127.0.0.1:55499/dhruto_chat_test \
  npx vitest run test/chat-foundation.e2e-spec.ts      # from apps/api
docker stop dhruto-chat-testdb
```

`test/chat-foundation.e2e-spec.ts` is **skipped** unless `CHAT_TEST_DATABASE_URL` is set. Its harness refuses any database whose name lacks `test` and drops the schema before migrating from zero. It never reads `DATABASE_URL` / `DB_*`.

## 5. Environment requirements

There are no new environment variables for runtime. `CHAT_TEST_DATABASE_URL` is test-only. PostgreSQL 13+ is required (`EXECUTE FUNCTION` trigger syntax and partial indexes); the project uses 16.

## 6. Applying to an environment

1. Back up the database.
2. `pnpm --filter @dhruto/api build`
3. `pnpm --filter @dhruto/api migration:show`. Expect `CommunicationPhase1Foundation1700000000010` pending.
4. `pnpm --filter @dhruto/api migration:run`
5. Verify: `\dt chat_*` shows 10 tables.

The migration has **not** been applied to the local development database or any shared environment as part of Phase 1. It was applied only to a disposable container.
