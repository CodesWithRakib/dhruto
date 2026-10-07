# Runbooks

## database-outage

- **Diagnose**: `/health/readiness` (503 + `database: unhealthy`), pg_isready,
  `dhruto_db_up` metric, pool counters (`active == max` = exhaustion).
- **Immediate**: stop deploys; API serves degraded reads from cache where
  possible; writes queue in outbox (durable in Postgres — safe as long as PG
  recovers; if PG is down, writes fail fast, no silent loss).
- **Recovery**: restart/failover Postgres → `migration:run` (no-op if current)
  → readiness 200 → re-enable traffic.
- **Verify**: login → parcel create → `/health/metrics/prometheus`
  `dhruto_db_up 1`; check outbox drains (`pending` → 0).
- **Post**: root-cause note, pool sizing review if exhaustion.

## redis-outage

- **Diagnose**: health `cacheDriver: memory-fallback`; `Queue unavailable,
  executing inline` warnings; BullMQ `reachable: false`.
- **Immediate**: no action required for correctness — cache fail-open,
  jobs run inline, rate limits best-effort. Expect higher DB load + latency.
- **Recovery**: restart Redis (AOF replays, ≤1s job loss) → app reconnects
  (`lazyConnect`, no restart needed).
- **Verify**: `cacheDriver: redis`, queue `reachable: true` in metrics.
- **Post**: if outage > 1h, warm caches by hitting overview/analytics once.

## queue-backlog

- **Diagnose**: `dhruto_queue_jobs{state="waiting"}` growing; `failed` spike
  in `/health/metrics`; DLQ table growth.
- **Immediate**: check provider status (SMS/email/webhook endpoints);
  pause nothing — retries back off automatically.
- **Recovery**: fix provider/endpoint → replay DLQ from admin UI (idempotent);
  scale workers (concurrency is code-config: notifications/webhooks 5,
  exports 2) only after confirming DB headroom.
- **Verify**: waiting → 0, DLQ OPEN → 0, spot-check deliveries.
- **Post**: consider limiter if a provider rate-limits us.

## provider-outage (SMS/email/webhook destinations)

- **Diagnose**: DLQ reasons (`PROVIDER_TIMEOUT`, `WEBHOOK_5XX`), provider
  latency in logs.
- **Immediate**: business transactions unaffected (notifications are
  persist-first + retrying). Notify merchants only if prolonged.
- **Recovery**: provider returns → automatic retry drains backlog; else
  replay from DLQ.
- **Verify**: delivery rate recovers in notification/webhook analytics.

## slow-api / high-error-rate

- **Diagnose**: `dhruto_http_latency_ms`, per-route logs (`durationMs`),
  `EXPLAIN ANALYZE` the suspect query; check pool `active`, Node event loop
  (login storms = bcrypt, expected, never weaken it).
- **Immediate**: enable/extend cache TTL for the hot read; kill abusive
  clients via rate limits (429 is working as designed).
- **Recovery**: add index (measure first) or paginate; redeploy rolling.
- **Verify**: re-run `scripts/load-baseline.mjs`, compare P95 to
  `docs/performance-report.md`.

## backup-restore

- **Backup**: `node scripts/backup-db.mjs` (pg_dump custom + SHA-256).
- **Restore drill**: `node scripts/restore-db.mjs` (restores into
  `dhruto_restore_drill`, checks migrations/parcels/wallets/FKs).
- **Verify**: FK violations 0; app boots against restored DB; spot-check
  wallet balances vs journal.
- **Post**: record duration + data-loss window; RPO ≤ 24h, RTO ≤ 30min.

## security-incident

- **Diagnose**: 403/404 spikes, DLQ auth failures, unexpected admin actions
  in logs (all carry actorId + requestId).
- **Immediate**: rotate JWT secrets + provider keys; revoke sessions
  (refresh rotation); block abusive IPs at edge.
- **Recovery**: verify tenant isolation tests pass; re-run
  `test/scale-concurrency.e2e-spec.ts` (IDOR section).
- **Post**: postmortem, add regression test for the vector used.
