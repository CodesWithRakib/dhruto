# Communication Platform — Phase 1 Repository Audit

Audit date: 2026-11-15 · Branch: `main` (clean at start, HEAD `a9befae`)

Every finding below was verified against the source, not taken from the existing docs.

## 1. Monorepo architecture

| Item                | Finding                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager     | pnpm (`packageManager: pnpm@12.4.2`), workspaces `apps/*`, `packages/*`                                                                 |
| Build orchestration | Turborepo 2.x (`turbo.json`: `build`, `lint`, `typecheck`, `test`, `test:e2e` all `dependsOn: ["^build"]`)                              |
| Node                | `>=20.18.0` (`.nvmrc`)                                                                                                                  |
| TypeScript          | `~5.8.2`, shared configs in `packages/tsconfig` (`nestjs.json` = CommonJS + decorators; `library.json` = NodeNext)                      |
| Lint                | ESLint 9 flat config, shared in `packages/eslint-config`; `@typescript-eslint/no-explicit-any` is an error                              |
| Format              | Prettier 3 (`.prettierrc` at root)                                                                                                      |
| Apps                | `apps/api` (NestJS 11), `apps/web-merchant` (Next.js 16.3, React 19.3)                                                                  |
| Packages            | `contracts` (zod + TS enums, built with tsup to CJS+ESM+d.ts), `ui`, `tsconfig`, `eslint-config`                                        |
| CI                  | `.github/workflows/ci.yml`: `turbo run lint typecheck test build` with Postgres 16 + Redis 7 services, then `db:setup` + Playwright E2E |

## 2. Relevant backend modules (`apps/api/src`)

- **Feature modules**: `auth`, `parcels`, `riders`, `hubs`, `merchants`, `finance`, `notifications`, `webhooks`, `integrations` (outbox relay, providers), `intelligence`, `analytics`, `pricing`, `health`.
- **Entities**: all in `src/database/entities/*.entity.ts`, re-exported from `entities/index.ts`, extend `BaseEntity` (`uuid` PK, `createdAt`/`updatedAt` timestamptz, camelCase column names). Domain columns use explicit snake_case `name:`.
- **Entity registration**: `autoLoadEntities: true` — an entity is loaded only if some module calls `TypeOrmModule.forFeature([...])`. The CLI `data-source.ts` additionally globs `dist/**/*.entity.js`.
- **Migrations**: `src/database/migrations/17000000000NN-<Name>.ts`, hand-written raw SQL, idempotent (`IF NOT EXISTS`, guarded `DO $$` blocks for enum types), explicit constraint names, full `down()`. Applied explicitly via `pnpm migration:run` (`migrate-cli.ts` boots the Nest context; `transaction: "each"`). `migrationsRun: false`.
- **Synchronize**: `synchronize: process.env.DB_SYNCHRONIZE === "true"` (opt-in only). See conflict C-4.
- **Validation**: global `DhrutoValidationPipe` (class-validator DTOs); contracts use zod.
- **Errors**: global `AllExceptionsFilter`, stable `ApiErrorCode` in contracts, `ResponseTransformInterceptor` envelope `{ success, statusCode, message, data, meta }`.
- **Idempotency**: `common/idempotency` (`IdempotencyRecord`, `Idempotency-Key` header) for HTTP mutations.
- **Rate limiting**: `common/rate-limit` (Redis-backed guard, opt-in per route via `@RateLimit`).
- **Events**: in-process `@nestjs/event-emitter` (`events/`), and a durable **transactional outbox** (`event_outbox` table, `integrations/outbox.service.ts`, `outbox-relay.service.ts` polling with `SKIP LOCKED`).

## 3. Frontend applications

Single Next.js app `apps/web-merchant` with role route groups under `app/[locale]/`: `(admin)`, `(merchant)`, `(hub)`, `(rider)`, `(customer)`, `(public)`, `(auth)`. Redux Toolkit store (`store/auth.slice.ts`), RTK Query base API in `lib/api/base-api.ts`, feature folders under `features/`, i18n via `next-intl` (`messages/` en/bn), Tailwind 3 + shadcn-style components in `packages/ui`. `socket.io-client` is used by `features/notifications/hooks/use-notification-socket.ts`, which also exposes `joinChatRoom`/`sendChatMessage` helpers that **no UI component uses**.

## 4. Authentication

- Custom JWT service (`auth/jwt/custom-jwt.service.ts`), access + refresh secrets, fail-closed in production (`config/auth.config.ts`).
- Global `JwtAuthGuard` (default-deny; `@Public()` opt-out) populates `request.user: AuthenticatedUser { id, email, phone, role, merchantId?, riderId?, hubId? }`.
- WebSocket auth: `NotificationsGateway.handleConnection` verifies the access token from `handshake.auth.token` or `Authorization` header.

## 5. Roles and permissions

- `UserRole` enum is defined in the API entity (`database/entities/User.entity.ts`), **not** in contracts: `ADMIN`, `MERCHANT`, `RIDER`, `HUB_MANAGER`, `CUSTOMER` (PG type `users_role_enum`). The web app types role as `string`.
- **There is no SUPERADMIN role** (see conflict C-1).
- Global `RolesGuard` + `@Roles(...)`; **ADMIN bypasses every role check** (`roles.guard.ts`).
- Fine-grained hub permissions: `HubPermission` enum in contracts + role ceiling in `common/permissions/hub-permissions.ts`, intersected with permissions granted on `HubUserAssignment` rows.

## 6. Tenant isolation

There is **no generic `tenant_id`**. Isolation is relational:

- Merchant data is scoped by `merchant_id` (from the JWT's `merchantId`, never the request body).
- Hub data is scoped by `HubUserAssignment` (active assignment + granted permissions).
- Rider data is scoped by `riders.user_id` / `riderId` claim.
- Customers have no FK to parcels; a parcel identifies its recipient by `recipient_phone` only.

## 7. Database conventions

PostgreSQL 16 (compose/CI), `uuid-ossp` (`uuid_generate_v4()`), enum types named `<table>_<column>_enum`, `timestamptz` everywhere, money as decimal/paisa, partial unique indexes for conditional uniqueness (e.g. `UQ_notifications_dedupe`), keyset cursor pagination already used for parcels (`base64url(createdAt|id)`). No hard deletes of users, merchants, hubs, or parcels exist in application code.

## 8. Redis and queues

- Redis config `config/redis.config.ts` (`REDIS_URL` or Upstash-derived `rediss://`, else host/port).
- BullMQ via `@nestjs/bullmq` (`queues/queues.module.ts`): queues `notifications`, `webhooks`, … with exponential backoff and bounded retention.
- `common/cache` Redis cache service (fail-open).
- No Redis Pub/Sub or Socket.IO Redis adapter is configured.

## 9. WebSocket capabilities

`notifications/gateways/notifications.gateway.ts` (Socket.IO, default namespace): authenticates, joins `user:`, `role:`, `merchant:`, `hub:`, `rider:` rooms, and exposes emit helpers used by notifications.

It also contains **placeholder chat handlers** (`chat:join`, `chat:message`, `chat:typing`, `chat:leave`) that:

- let any authenticated user join **any** `chat:<roomId>` with no membership check,
- broadcast unpersisted messages with ad-hoc IDs (`msg_<timestamp>_<random>`), no idempotency, no ordering,
- hardcode CORS origins to `localhost:5000`.

This is a broken-access-control risk (S-1 below). Phase 1 does not modify the gateway (strict phase boundary); Phase 3 must replace these handlers.

## 10. Potential conflicts

| ID  | Conflict                                                                                                                                                                                                                                                               | Resolution in Phase 1                                                                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C-1 | Spec lists **Superadmin**; no such role exists. Adding one is an auth change requiring explicit approval.                                                                                                                                                              | No role added. Staff chat capabilities are modelled as `ChatPermission` values with a role ceiling (`common/permissions/chat-permissions.ts`); a future SUPERADMIN gets the full set and ADMIN can then be narrowed without touching call sites. |
| C-2 | Spec mentions "tenant ownership"; there is no tenant id.                                                                                                                                                                                                               | Conversations carry `merchant_id`, `hub_id`, `parcel_id` scope references.                                                                                                                                                                       |
| C-3 | Spec proposes `ChatOutboxEvent`; a production transactional outbox (`event_outbox`) already exists.                                                                                                                                                                    | Reuse `event_outbox`. No new outbox table.                                                                                                                                                                                                       |
| C-4 | **Pre-existing drift**: TypeORM's schema builder reports **186** differences between existing (non-chat) entities and the migrated schema (it would drop hand-named FKs and indexes). Enabling `DB_SYNCHRONIZE=true` against a migrated database would be destructive. | Not changed (unrelated). Chat entities have **zero** drift, verified by test. Recommend a separate hardening task to forbid `DB_SYNCHRONIZE` outside throwaway DBs.                                                                              |
| C-5 | `OutboxRelayService` throws `No fan-out configured for event …` for any `DomainEventType` without a `FANOUT` entry.                                                                                                                                                    | No chat event types added yet. Phase 2+ must register fan-out (or route by `aggregate_type`) before writing chat events.                                                                                                                         |
| C-6 | `RolesGuard` lets ADMIN through every `@Roles` check.                                                                                                                                                                                                                  | Chat authorization must not rely on `RolesGuard` alone; documented in `ARCHITECTURE-DECISIONS.md` (ADR-007).                                                                                                                                     |
| C-7 | Spec's "Customer" participants: parcels have no customer user FK.                                                                                                                                                                                                      | `PARCEL_DELIVERY` participants are resolved by the Phase 5 workflow (recipient phone ↔ customer user); schema stores participants by `user_id` only.                                                                                             |

## 11. Missing infrastructure (for later phases)

- Socket.IO Redis adapter / Pub/Sub for multi-instance fan-out (Phase 3).
- Object storage integration (no S3/MinIO code exists) for attachments (later phase).
- Persistent audit log table (only logger-based `AuditEventListener` existed) — **added** for chat as `chat_audit_logs`.
- A dedicated disposable test database in CI for schema tests (CI runs migrations via `db:setup`, but the new DB test suite is skipped unless `CHAT_TEST_DATABASE_URL` is set).
- Circular-import checking tool (none installed).

## 12. Security findings

| ID  | Severity      | Finding                                                                                                                                                                                                                                      |
| --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-1 | High (latent) | Placeholder `chat:*` socket handlers allow joining arbitrary rooms and relaying unpersisted messages. No UI uses them today, but any authenticated client can. Replace in Phase 3; consider removing earlier as a separate, approved change. |
| S-2 | Medium        | Gateway CORS origins hardcoded to localhost.                                                                                                                                                                                                 |
| S-3 | Info          | Pre-existing lint error `apps/api/src/main.ts:90` (`no-explicit-any`) fails `pnpm lint` and therefore CI's `turbo run lint`. Unrelated to this phase; not modified.                                                                          |

## 13. Recommended integration strategy

1. Keep chat entities in the shared `database/entities/` folder (existing convention) and register them through a dedicated `src/chat/chat.module.ts` (`forFeature` only in Phase 1).
2. Put API-boundary contracts in `packages/contracts/src/chat/` and export from the package root.
3. Add one additive, idempotent migration `1700000000010-CommunicationPhase1Foundation`.
4. Model staff powers as audited `ChatPermission`s, never as implicit ADMIN access.
5. Reuse `event_outbox`, `users_role_enum`, `IdempotencyRecord` (HTTP), keyset pagination patterns.

## 14. Files created or modified

See `PHASE-1-REPORT.md` §B for the final list.
