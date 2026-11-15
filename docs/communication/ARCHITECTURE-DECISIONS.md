# Communication Platform — Architecture Decisions

Format: context → decision → consequences. Status of all entries: **Accepted (Phase 1)**.

## ADR-001 — Modular chat domain inside the existing API

**Context.** The communication platform must evolve independently but share auth, users, parcels, hubs, and infrastructure with the logistics API.
**Decision.** A `ChatModule` (`apps/api/src/chat/`) owns the domain. Phase 1 registers persistence only. Entities live in the shared `database/entities/` folder (existing convention) with a `Chat` prefix and `chat_` table prefix.
**Consequences.** No new service or deployable. A future extraction into a separate service is possible because chat tables reference core tables only through FKs to `users`, `parcels`, `hubs`, `merchants`, and nothing in core references chat.

## ADR-002 — Per-conversation BIGINT sequence is the only ordering authority

**Context.** Timestamps collide and skew across instances; clients need gap detection after reconnects.
**Decision.** Every message gets `sequence BIGINT`, unique per conversation (`UQ_chat_messages_conversation_sequence`). The counter lives on `chat_conversations.last_message_sequence`. The send path (Phase 2) runs, in one transaction:

```sql
UPDATE chat_conversations SET last_message_sequence = last_message_sequence + 1, ...
 WHERE id = $1 AND status = 'ACTIVE' RETURNING last_message_sequence;
INSERT INTO chat_messages (..., sequence) VALUES (..., $returned);
```

The UPDATE's row lock serializes senders in one conversation; the unique index is the backstop.
**Consequences.** Gap-free, strictly increasing sequences (verified with 20 concurrent senders in the test suite). One very busy conversation is limited by that row lock (thousands of messages per second is far beyond expected per-thread volume). Sequences travel as decimal strings in JSON.
**Rejected.** A PostgreSQL `SEQUENCE` per conversation (unbounded object count). `MAX(sequence)+1` (racy). Global sequence (creates gaps that defeat gap detection).

## ADR-003 — Idempotent sends via a client-generated UUID

**Decision.** Human-sent messages must carry `client_message_id uuid` (CHECK enforced). `UQ_chat_messages_conversation_sender_client (conversation_id, sender_user_id, client_message_id)` guarantees a retry can never create a second row. Phase 2 uses `INSERT … ON CONFLICT (…) DO NOTHING` and then returns the existing row. Note that a conflicting insert still consumes a counter increment if done after the UPDATE, so Phase 2 must look up the existing message **before** incrementing the counter (and treat the conflict as a fallback).
**Consequences.** Works across sockets, tabs, and devices. Independent of the HTTP `Idempotency-Key` mechanism (which stays available for REST).

## ADR-004 — Cursor-based read and delivery state

**Decision.** `chat_participants.last_read_sequence` / `last_delivered_sequence` (BIGINT, monotonic, `delivered >= read`). No per-message, per-recipient receipt rows.
**Unread count:** `max(0, conversation.last_message_sequence − participant.last_read_sequence)`. This is O(1) per conversation and is computed in the conversation-list query. The send path advances the sender's own cursors to the new sequence, so their own messages never count as unread.
**Trade-off.** Messages deleted after being sent still count until they are read. This is accepted for performance.

## ADR-005 — Keyset pagination for history; no full-history loads

**Decision.** `GET /chat/conversations/:id/messages?beforeSequence=&limit=` (limit ≤ 100, default 50) and `afterSequence` for gap fill. Both are served by the unique `(conversation_id, sequence)` btree in either direction (plan verified with no Sort node). The conversation list uses an opaque keyset cursor over `(last_message_at, id)`.
**Consequences.** Constant cost per page regardless of history size. The frontend must virtualize (Phase 6).

## ADR-006 — Reuse `event_outbox`; no `ChatOutboxEvent` table

**Context.** A production transactional outbox with SKIP LOCKED polling, retries, and DLQ already exists.
**Decision.** Chat domain events (message created, conversation status changed, …) will be appended to `event_outbox` in the same transaction as the state change (Phase 2+), with `aggregate_type = 'chat_conversation'`.
**Prerequisite.** `OutboxRelayService` throws for event types without a `FANOUT` entry. Chat event types must be added to `DomainEventType` together with their fan-out targets (or the relay must route by aggregate type) in the phase that first emits them.

## ADR-007 — Staff access is permission-based, explicit, and audited

**Context.** `RolesGuard` lets ADMIN pass every role check. There is no SUPERADMIN.
**Decision.**

- Participants act through **membership + participant role** (`CHAT_PARTICIPANT_ROLE_CAPABILITIES`).
- Staff act on conversations they are not part of only through `ChatPermission` values (`CONVERSATION_VIEW_ANY`, `CONVERSATION_INTERVENE`, `CONVERSATION_MODERATE`, `MESSAGE_MODERATE`, `INTERNAL_NOTE_MANAGE`, `REPORT_REVIEW`, `AUDIT_VIEW`). The role ceiling is in `apps/api/src/common/permissions/chat-permissions.ts`.
- Every non-participant view or intervention writes a `chat_audit_logs` row. A DB CHECK requires a non-empty `reason` for `ADMIN_CONVERSATION_VIEWED` / `ADMIN_INTERVENTION`.
- Hub managers have moderation and notes permissions only, and must be bounded to their assigned hubs by the service layer.
  **Consequences.** "Admin" never means silent, unrestricted reading. Introducing SUPERADMIN later is a one-line ceiling change plus the (approved) auth change.

## ADR-008 — Internal notes and audit records are structurally separate

**Decision.** `chat_internal_notes` and `chat_audit_logs` are separate tables, never rows in `chat_messages`. No message query, history page, unread count, or socket fan-out can include them by accident. `chat_audit_logs` is append-only: no `updatedAt`, and the trigger `TRG_chat_audit_logs_immutable` rejects UPDATE. Audit target IDs have no FKs, so audit history outlives purges.

## ADR-009 — Scope references instead of a tenant id

**Decision.** Conversations carry nullable `parcel_id`, `hub_id`, `merchant_id` (FK, `ON DELETE RESTRICT`). CHECK constraints enforce type requirements: `PARCEL_DELIVERY` needs parcel + merchant, `HUB_OPERATIONS` needs a hub, `MERCHANT_DESK` needs a merchant. These mirror `CHAT_CONVERSATION_SCOPE_REQUIREMENTS` in contracts. A partial unique index allows one `PARCEL_DELIVERY` conversation per parcel. It is reopened rather than duplicated, which makes workflow-driven creation idempotent.

## ADR-010 — One membership row per (conversation, user)

**Decision.** `UQ_chat_participants_conversation_user` is a full unique constraint. Leaving and rejoining flips `status` (`ACTIVE`/`LEFT`/`REMOVED`) and preserves cursors. Membership history is kept in the audit log.
**Rejected.** A partial unique index `WHERE status = 'ACTIVE'` with history rows. It complicates cursor carry-over and membership checks for little benefit.

## ADR-011 — Participant permissions derive from participant role

**Decision.** There is no per-row permissions column. Capabilities are a pure function of `(participant role, membership status)` in contracts. Write capabilities additionally require `isConversationWritable(status)`.
**Consequences.** The rules are simple and testable, and shared by API and UI. A per-row override column can be added later without breaking anything (YAGNI).

## ADR-012 — No partitioning in Phase 1

**Context.** Partitioning `chat_messages` complicates FKs (reactions, edits, pins, attachments, reports, and the reply self-FK) and unique constraints. Partitioned-table uniques must include the partition key, and the existing tooling (TypeORM schema diff, migration conventions) has no partition support.
**Decision.** Ship a plain table. The indexes are designed so each hot query is a single btree range scan.
**Migration path when needed.** This triggers at roughly 100M+ rows, or when vacuum or index size hurts. Plan: `PARTITION BY HASH (conversation_id)` (keeps every history query in one partition). Change the PK to `(conversation_id, id)`. Convert child FKs to composite `(conversation_id, message_id)` (children already store or can derive `conversation_id`). Backfill with an online copy (`INSERT … SELECT` in batches plus a dual-write window), then swap. An archive tier (time-based detach of old conversations) is an alternative. Full details are in `DATABASE-DESIGN.md` §8.

## ADR-013 — Typed, safe message metadata

**Decision.** `metadata jsonb` must be a JSON object (CHECK). Its shape is fixed per message type by strict zod schemas in contracts: location, quick action, voice, system event (scalar params only, max 20). Client-sent `SYSTEM_EVENT` messages are rejected at validation. Unknown keys are rejected (`.strict()`), so clients cannot smuggle `senderId`, `sequence`, HTML, or nested payloads.

## ADR-014 — Attachments are metadata only

**Decision.** Bytes go to object storage (a later phase). `chat_attachments` stores `storage_key` (unique, never exposed in contracts), filename, MIME type (allow-listed in contracts), size (≤ 25 MiB, `> 0` CHECK), SHA-256 (lowercase hex CHECK), and status (`PENDING`→`UPLOADED`|`REJECTED`). The row is reserved before upload and linked to a message on send.

## ADR-015 — Delete rules favour history preservation

**Decision.** Everything referencing a conversation, user, parcel, hub, or merchant uses `ON DELETE RESTRICT`, so purges must be explicit jobs. Pure message dependents (reactions, edits, pins) `CASCADE` with their message. Replies `SET NULL`. Attachments and reports `RESTRICT`, because storage cleanup and moderation evidence must be handled deliberately. Application code never hard-deletes users, parcels, hubs, or merchants today, so this blocks no existing flow.

---

# Phase 2 additions

## ADR-016 — Live eligibility on every request

**Decision.** Conversation access requires an ACTIVE membership **and** eligibility re-evaluated from database facts on each request (parcel's current rider/hub, merchant ownership, active hub assignments, account status). JWT claims are used for identity only.
**Consequences.** Reassignment and unassignment revoke access immediately without background jobs. Each request costs about 3–5 small indexed queries.

## ADR-017 — Chat validates with the shared zod contracts

**Decision.** Chat routes validate with `ZodValidationPipe` and the strict `@dhruto/contracts` schemas instead of class-validator DTOs. Errors keep the platform's `422 VALIDATION_ERROR` shape.
**Consequences.** There is one schema source for API and web, and unknown keys are rejected rather than stripped. This deviates from the rest of the API, which uses class-validator.

## ADR-018 — Staff path = permission + reason + audit, on the same routes

**Decision.** Mutating routes accept a participant path (capability) or a staff path (scoped `ChatPermission` + `reason`). Staff content reads live under `/chat/admin/*` with a mandatory reason. Every staff action writes `chat_audit_logs` in the same transaction.

## ADR-019 — Deleted content is retained for moderation

**Decision.** Soft delete clears visible content and metadata, and copies the last content into `chat_message_edits` (moderator-only). A sender therefore cannot destroy report evidence.
**Consequences.** A retention and purge policy is required before go-live.

## ADR-020 — Chat events are registered with empty fan-out

**Decision.** All `chat.*.v1` events have `FANOUT` entries of `[]` and `EVENT_TEMPLATES` entries of `null`, so the relay marks them PUBLISHED. Payloads carry ids only. Phase 3 adds a realtime target that reloads authoritative rows.

## ADR-021 — DIRECT/GROUP are internal-only

**Decision.** Merchants and customers communicate only through scoped types (PARCEL_DELIVERY, SUPPORT_TICKET, MERCHANT_DESK). This prevents cold-messaging arbitrary users by id. Internal DIRECT/GROUP members must share a hub with a non-admin adder.

---

# Phase 3 additions

## ADR-022 — Dedicated `/chat` namespace beside the legacy guard

**Decision.** Realtime chat runs in its own Socket.IO namespace with events that never use the reserved `chat:` prefix. The S-1 guard stays on `/` unchanged.
**Why.** `socket.use` guards are per socket, so the namespaces are isolated by construction. The legacy rejection cannot block legitimate traffic, and the old pathway cannot be revived.

## ADR-023 — Durable events go to per-user rooms of currently eligible participants

**Decision.** The outbox fan-out recomputes recipients per event (ACTIVE membership ∩ live eligibility) and emits to `u:<userId>` rooms. Conversation rooms carry only ephemeral traffic and are re-authorized periodically.
**Consequences.** Removal, reassignment and unassignment stop durable delivery immediately. Each event costs about 6 indexed queries.

## ADR-024 — Redis pub/sub adapter; durability stays in PostgreSQL

**Decision.** Use `@socket.io/redis-adapter` on the existing Redis deployment, with probe-gated fan-out (outbox retry while Redis is unhealthy) and REST `afterSequence` gap-fill for recovery. Delivery is at-least-once and best-effort, deduped by `eventId`.
**Rejected.** The streams adapter with connection-state recovery: it duplicates the sequence-based recovery we already have and adds Redis storage.

## ADR-025 — Messages are sent over REST; sockets receive

**Decision.** There is no socket "send message" event. Idempotency, rate limits and attachment validation stay on the Phase 2 REST path. Sockets carry delivery, typing, presence and cursor updates (cursor updates reuse the same service).

## ADR-026 — Ephemeral state never touches PostgreSQL

**Decision.** Presence lives in Redis sorted sets (multi-device, TTL-expired, atomic transitions). Typing lives in per-socket memory with a TTL and throttle. There are no heartbeat or typing writes to the database and no new migration.

# Phase 4 additions

## ADR-027 — The messenger lives in the `messages` layout

**Decision.** Each role's `messages/layout.tsx` renders the messenger; the list and thread pages return `null` and only drive the URL. `DashboardShell` keys `<main>` with one key for all `/…/messages/*` paths.
**Why.** App Router layouts persist across child segment changes, so switching conversations keeps one socket, one set of listeners and warm caches, while refresh, back/forward and deep links still restore the selected conversation.

## ADR-028 — A dedicated timeline slice beside RTK Query

**Decision.** Server caches (inbox, detail, pins, search) stay in RTK Query; the per-conversation message timeline lives in a Redux slice keyed by `clientMessageId ?? id`.
**Why.** The timeline merges REST pages, socket events and optimistic sends with sequence ordering, terminal deletes, `eventId` dedupe and gap-aware recovery — rules an endpoint cache cannot express cleanly. Bounded by an LRU of 8 conversations.
**Rejected.** A second state library; patching `getMessages` caches per page argument.

## ADR-029 — Native `content-visibility` instead of list virtualization

**Decision.** Message rows use `content-visibility: auto` with an intrinsic size; history pages are 50 messages and the timeline is bounded.
**Why.** Keeps browser scroll anchoring, find-in-page and screen-reader order intact without a new dependency. Revisit if very long sessions show measurable cost.
