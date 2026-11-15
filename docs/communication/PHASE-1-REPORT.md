# Communication Platform — Phase 1 Report

Date: 2026-11-15 · Scope: repository audit, architecture, database foundation, shared contracts, security policy.

## A. Repository audit

Full details are in `PHASE-1-AUDIT.md`. Key facts:

- pnpm + Turborepo monorepo. NestJS 11 API with TypeORM 0.3 and PostgreSQL 16. Next.js 16 web app with role route groups. zod/TS-enum contracts package.
- Explicit, idempotent raw-SQL migrations. `autoLoadEntities` with per-module `forFeature`. `synchronize` is opt-in only.
- Platform roles: `ADMIN`, `MERCHANT`, `RIDER`, `HUB_MANAGER`, `CUSTOMER`. **There is no SUPERADMIN.** `RolesGuard` lets ADMIN bypass every role check.
- No tenant id: isolation comes from `merchant_id`, `HubUserAssignment`, and rider claims.
- A transactional outbox (`event_outbox` + relay) already exists. Reused, not duplicated.
- The existing `NotificationsGateway` has placeholder `chat:*` handlers with **no membership checks** (security finding S-1).
- **Pre-existing drift of 186 statements** between non-chat entities and the migrated schema. `DB_SYNCHRONIZE=true` would be destructive (C-4).
- Pre-existing lint error at `apps/api/src/main.ts:90` (S-3).

## B. Implementation summary

### Created (24 files)

| File                                                                                                                                       | Purpose                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `packages/contracts/src/chat/chat.enums.ts`                                                                                                | Chat enums incl. `ChatPermission`, `ChatAuditAction`                |
| `packages/contracts/src/chat/chat.policy.ts`                                                                                               | Lifecycle transitions, scope requirements, participant capabilities |
| `packages/contracts/src/chat/chat.schema.ts`                                                                                               | Limits, request schemas, response types, unread helper              |
| `packages/contracts/src/chat/index.ts`                                                                                                     | Barrel                                                              |
| `packages/contracts/src/chat/chat.schema.test.ts`                                                                                          | 30 contract tests                                                   |
| `apps/api/src/database/entities/ChatConversation.entity.ts`                                                                                | Entity                                                              |
| `apps/api/src/database/entities/ChatParticipant.entity.ts`                                                                                 | Entity                                                              |
| `apps/api/src/database/entities/ChatMessage.entity.ts`                                                                                     | Entity                                                              |
| `apps/api/src/database/entities/ChatAttachment.entity.ts`                                                                                  | Entity                                                              |
| `apps/api/src/database/entities/ChatMessageReaction.entity.ts`                                                                             | Entity                                                              |
| `apps/api/src/database/entities/ChatMessageEdit.entity.ts`                                                                                 | Entity                                                              |
| `apps/api/src/database/entities/ChatPin.entity.ts`                                                                                         | Entity                                                              |
| `apps/api/src/database/entities/ChatReport.entity.ts`                                                                                      | Entity                                                              |
| `apps/api/src/database/entities/ChatInternalNote.entity.ts`                                                                                | Entity                                                              |
| `apps/api/src/database/entities/ChatAuditLog.entity.ts`                                                                                    | Entity (append-only)                                                |
| `apps/api/src/database/migrations/1700000000010-CommunicationPhase1Foundation.ts`                                                          | Migration                                                           |
| `apps/api/src/chat/chat.module.ts`                                                                                                         | `forFeature` registration only                                      |
| `apps/api/src/common/permissions/chat-permissions.ts`                                                                                      | Staff chat permission ceiling                                       |
| `apps/api/src/common/permissions/chat-permissions.spec.ts`                                                                                 | 4 unit tests                                                        |
| `apps/api/test/utils/chat-test-db.ts`                                                                                                      | Disposable-DB harness (guarded)                                     |
| `apps/api/test/chat-foundation.e2e-spec.ts`                                                                                                | 32 schema/migration tests                                           |
| `docs/communication/PHASE-1-AUDIT.md`, `ARCHITECTURE-DECISIONS.md`, `DATABASE-DESIGN.md`, `PHASE-1-IMPLEMENTATION.md`, `PHASE-1-REPORT.md` | Documentation (counted as 1 row; 5 files)                           |

### Modified (3 files, 14 added lines, 0 removed)

| File                                      | Change                             |
| ----------------------------------------- | ---------------------------------- |
| `packages/contracts/src/index.ts`         | `export * from "./chat/index.js";` |
| `apps/api/src/database/entities/index.ts` | Export the 10 chat entities        |
| `apps/api/src/app.module.ts`              | Import and register `ChatModule`   |

No other existing file was changed. The `NotificationsGateway` placeholder handlers were left as-is because of the phase boundary.

## C. Database summary

There are 10 tables: `chat_conversations`, `chat_participants`, `chat_messages`, `chat_attachments`, `chat_message_reactions`, `chat_message_edits`, `chat_pins`, `chat_reports`, `chat_internal_notes`, `chat_audit_logs`. There are 10 new enum types, and `users_role_enum` is reused. Altogether, verified against the migrated schema: 18 secondary indexes (8 unique, 7 partial) plus 10 primary keys, 19 CHECK constraints, and 27 named foreign keys. There is one trigger (`TRG_chat_audit_logs_immutable`). The ER diagram, the mapping of indexes to queries, and all delete rules are in `DATABASE-DESIGN.md`.

Main guarantees: BIGINT per-conversation sequence uniqueness, send idempotency, one membership per user per conversation, one `PARCEL_DELIVERY` thread per parcel, type-specific scope, monotonic-cursor invariants, safe metadata shape, an admin audit reason, and append-only audit rows.

`ChatOutboxEvent` was **not** created (reuses `event_outbox`, ADR-006).

## D. Shared contracts

All are exported from the `@dhruto/contracts` root. Enums: `ChatConversationType`, `ChatConversationStatus`, `ChatMessageType`, `ChatParticipantRole`, `ChatParticipantStatus`, `ChatNotificationLevel`, `ChatMessageDeliveryStatus`, `ChatAttachmentStatus`, `ChatReportReason`, `ChatReportStatus`, `ChatAuditAction`, `ChatPermission`, `ChatParticipantCapability`. Policy and schemas, limits, and response types are listed in `PHASE-1-IMPLEMENTATION.md` §3. The package builds to CJS, ESM, and d.ts, and the web app typechecks against it.

## E. Migration summary

| Item                                         | Value                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                                         | `CommunicationPhase1Foundation1700000000010`                                                                                                                                          |
| Nature                                       | Additive, idempotent, no changes to existing objects                                                                                                                                  |
| Commands                                     | `pnpm --filter @dhruto/api build && pnpm --filter @dhruto/api migration:run` (revert: `migration:revert`)                                                                             |
| Disposable DB (postgres:16-alpine container) | Full chain 0000–0010 applied from an empty schema ✅; re-run `up` no-op ✅; `down` ✅; re-apply ✅; compiled CLI `revert` → `show` (pending: yes) → `run` → `show` (pending: none) ✅ |
| Entity ↔ schema drift (chat tables)          | **0 statements** ✅                                                                                                                                                                   |
| Local development DB / shared environments   | **Not applied** (intentional; requires your go-ahead)                                                                                                                                 |

## F. Security review

- Identity comes from the JWT only. Contracts reject `senderId`, `sequence`, and other unknown keys.
- Access to a conversation requires an ACTIVE membership row **or** a staff `ChatPermission`, and staff access is audited.
- ADMIN gets no implicit access to content. Viewing or intervening requires a permission plus a reason, enforced by a DB CHECK.
- Hub managers can only moderate and keep notes, bounded to their assigned hubs. Merchants, riders, and customers have no staff permissions.
- Internal notes and audit logs are separate tables. Audit rows cannot be updated.
- No phone or email in participant contracts. `storage_key` is never exposed. Metadata is strictly typed. There is a MIME allow-list and filenames are sanitised.
- **Open risk S-1:** the placeholder socket `chat:*` handlers still allow joining any room. They must be removed or replaced in Phase 3, or earlier as a separately approved fix.

## G. Testing report (commands actually executed)

| Command                                                                              | Result                                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `pnpm --filter @dhruto/contracts typecheck`                                          | ✅ pass                                                                   |
| `pnpm --filter @dhruto/contracts lint`                                               | ✅ pass                                                                   |
| `pnpm --filter @dhruto/contracts test`                                               | ✅ 42/42 (12 existing + 30 new)                                           |
| `pnpm --filter @dhruto/contracts build`                                              | ✅ pass                                                                   |
| `apps/api: pnpm typecheck`                                                           | ✅ pass                                                                   |
| `apps/api: pnpm lint`                                                                | ❌ 1 error, **pre-existing** (`src/main.ts:90`, identical before changes) |
| `apps/api: eslint` on all new/changed chat files                                     | ✅ clean                                                                  |
| `apps/api: npx vitest run src`                                                       | ✅ 171/171 (167 baseline + 4 new)                                         |
| `apps/api: CHAT_TEST_DATABASE_URL=… npx vitest run test/chat-foundation.e2e-spec.ts` | ✅ 32/32 against a disposable Postgres 16                                 |
| Same spec without `CHAT_TEST_DATABASE_URL`                                           | ✅ 32 skipped (never touches the dev DB)                                  |
| `apps/api: pnpm build` + compiled `migrate-cli` revert/show/run                      | ✅ (`AppModule` boots with `ChatModule`)                                  |
| `apps/web-merchant: pnpm typecheck`                                                  | ✅ pass                                                                   |
| `prettier --check` on all new files                                                  | ✅ (after `--write` on new files only)                                    |

**Not executed:**

- Existing API e2e suites (`test/*.e2e-spec.ts`) and Playwright. They mutate the seeded development database, and nothing they exercise changed. CI will run them.
- Circular-import check: no tool is installed (madge/dpdm), and none was added. By design, chat entities only reference parents (plus the reply self-reference). Nothing in core imports chat.

## H. Known limitations

1. Repo-wide `pnpm lint` (and so CI's `turbo run lint`) fails on the pre-existing `main.ts:90` error. It is unrelated and was not modified.
2. The migration has not been applied to the dev DB or any shared environment.
3. The DB test suite is not wired into CI yet. It needs a dedicated `CHAT_TEST_DATABASE_URL` service DB. CI's `db:setup` will still apply the migration to its Postgres service.
4. Pre-existing entity/migration drift in non-chat tables (C-4) remains.
5. Pin/attachment/report "message belongs to the same conversation" is a service-level rule, not a composite FK (ADR, `DATABASE-DESIGN.md` §8).
6. Unread counts include messages deleted after being sent (ADR-004).
7. Placeholder socket chat handlers remain (S-1).
8. No SUPERADMIN role. Adding one needs explicit approval for an auth change.

## I. Phase 2 readiness

Phase 2 can safely build these on this foundation:

- Conversation, participant, and message application services: get-or-create, list (keyset), history (`beforeSequence`/`afterSequence`), send with the row-lock counter + idempotent insert (look up the existing `client_message_id` **before** incrementing), mark read/delivered with `GREATEST`, edit/delete with edit history, reactions, pins, reports.
- An authorization service implementing ADR-007, plus audit writes.
- REST controllers validated with the contracts schemas, with `@RateLimit` on send.
- Chat `DomainEventType`s with `FANOUT` registration before the first outbox write (C-5).

Prerequisites before chat ships to users: remove or replace the placeholder socket handlers (S-1), and apply the migration in each environment after a backup.

## J. Completion status

**COMPLETE WITH DOCUMENTED LIMITATIONS**

Every Phase 1 deliverable is implemented and verified against a disposable database. Repo-wide lint is blocked by a pre-existing, unrelated error. The migration has deliberately not been applied outside the disposable database. No circular-import tool is available.
