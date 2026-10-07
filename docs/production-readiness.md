# Production Readiness

## Environments & variables

Required: `NODE_ENV, PORT, API_PREFIX, CORS_ORIGIN, DATABASE_URL`
(or `DB_HOST/PORT/USERNAME/PASSWORD/DATABASE`), `REDIS_URL` (or
`REDIS_HOST/PORT`), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
(≥32 chars, unique per env — dev placeholders in `.env.example` must never
reach production), `INTELLIGENCE_PHONE_PEPPER` (long random, never committed).
Optional tuning: `DB_POOL_MAX/MIN` (20/2), `DB_STATEMENT_TIMEOUT_MS` (30000),
`OUTBOX_POLL_MS` (3000), provider keys/URLs, webhook timeout/retry settings.
Real `.env` files are git-ignored; only `.env.example` is tracked.

## Database

- Migrations own the schema (`synchronize: false`, `migrationsRun: false`);
  apply with `pnpm --filter @dhruto/api migration:run`. Expand/contract for
  breaking changes; every migration here is `IF NOT EXISTS` + reversible.
- Pool: 20 max / 2 min per instance; compose sets Postgres
  `max_connections=100` (4 instances + workers + headroom). Statement timeout
  30s bounds runaway analytics/exports.
- Backup: `node scripts/backup-db.mjs` (real `pg_dump` custom format +
  SHA-256, 7-file rotation). Restore drill: `node scripts/restore-db.mjs`
  (verified 2026-10-07: 10 migrations, 1303 parcels, 4 wallets, 0 FK
  violations, 6.0s). **RPO ≤ 24h** (daily backup), **RTO ≤ 30min**
  (restore 6s + migrate + boot + verify).

## Redis / queues / workers

- Redis 7 with AOF (`appendfsync everysec`): cache loss is tolerable
  (fail-open to LRU), queue jobs survive restarts. App runs degraded without
  Redis (verified: health `degraded`, inline queue execution).
- BullMQ concurrency: notifications 5, webhooks 5, analytics-exports 2;
  attempts 3–4 with exponential backoff; completed 500–1000 / failed
  1000–5000 retained; DLQ replay is admin-only + idempotent.
- Outbox relay polls every 3s (`SKIP LOCKED`, ≤25/tick); duplicate delivery
  across replicas is absorbed by dedupe keys.

## Runtime

- `helmet`, CORS allowlist, 1mb body caps, gzip compression, graceful
  `enableShutdownHooks`. Liveness = process alive; readiness = DB+cache with
  **503** when not ready (never restart healthy processes on DB blips).
- Prometheus text at `/health/metrics/prometheus` (RED + pool + queues +
  memory); JSON at `/health/metrics`; requestId/actorId/tenantId structured
  logs; no passwords/OTP/secrets/full PII in logs.
- Rate limits per endpoint (auth/parcel/intel/analytics/export scopes);
  burst → 429 + `Retry-After` (verified in test).

## Frontend

- `output: standalone` image-ready build; no chart lib (hand SVG);
  RTK polling pauses when tab unfocused; all analytics pages `noindex`;
  EN/BN; mobile verified 390px with zero overflow (Brave CDP smoke 6/6).

## Deploy / rollback

Rolling deploy, ≥2 API instances behind health-checked LB (readiness gate).
Rollback = previous image + `migration:revert` only if the migration was the
cause (all Phase 8 migrations are additive/index-only). Verify with
`docs/runbooks/smoke.md` (login → parcel → analytics → export).

## SLOs (internal targets, not SLA)

Availability 99.5% monthly; API P95 < 500ms; health P95 < 100ms;
queue backlog drains < 5min; DLQ triaged < 24h. Error budget: if availability
dips below target two weeks running, freeze features for reliability work.
Tracing: deliberately no OTEL (undeployable here); requestId→eventId→jobId
correlation covers API→outbox→queue→worker→provider instead.
