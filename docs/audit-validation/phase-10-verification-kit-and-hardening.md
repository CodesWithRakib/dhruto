# Phase 10 — Verification Kit + Load/Resilience Hardening + Bulk-Async Decision

> Per owner instruction (code-only, no runs): no servers started, no test,
> build, typecheck, or lint executions. All changes are code + docs; every
> run below is PENDING owner execution.

## Item 1 — Phase 9 backlog, owner-runnable (`scripts/phase9-verify.ps1`, NEW)

One command runs the whole Phase 9 backlog and cleans up after itself
(`try/finally` kills everything it started):

1. Drop/create `dhruto_phase9` + `migration:run` (10) + `seed` (37 parcels).
2. Start API `:4000` + `:4001` on that DB (shared Upstash Redis), poll
   `/health` on both.
3. `vitest run test/rate-limit-multi-instance.e2e-spec.ts` (70 lookups,
   60 pass + 10 × 429 expected).
4. Start web `:5000`, poll, then Brave `parcel-list` journey (5 tests).
5. Print PASS + where to record results (the Phase 9 doc).

Prereqs (checked into the script header): local PostgreSQL
`postgres/password`, shared Redis reachable, Brave installed, `pnpm` deps
installed, `apps/api/dist` built. PENDING: the run itself.

## Item 2 — Load-baseline hardening (`scripts/load-baseline.mjs`)

Two real flaws fixed (found by reading the limiter + controllers, not by running):

- **Single identity measured the limiter, not the endpoints.** The guard
  keys authenticated callers by user id, and every scenario reused one
  token — parcel-list (120/min), overview/parse (60/min), create (30/min)
  would all 429 mid-scenario. The harness now round-robins the three seeded
  accounts (merchant, merchant2, admin — all role-allowed on every scenario;
  verified `parcels.controller.ts:52`, `analytics.controller.ts:294`,
  `intelligence.controller.ts:89,120`). Per-identity math, enforced by the
  scenario counts: list 200/3 ≈ 67 < 120, create 60/3 = 20 < 30, overview +
  parse 150/3 = 50 < 60. The 200→150 count changes are budget-derived and
  commented as such. `X-Forwarded-For` rotation is kept as belt-and-braces
  (inert on authed routes by guard design — commented honestly).
- **429s were invisible** (only ≥500 counted as errors; everything else was
  "ok"). The harness now reports `throttled` per scenario, prints a
  reference verdict (`parcel-list p95 < 300ms, 0 errors, 0 throttled`), and
  warns when any scenario throttles. Exit code unchanged.
- Verified while here (no change needed): `intelligence/address/parse`
  exists (v2, `intelligence.controller.ts:119`) and the harness body
  `{ rawAddress }` satisfies `AddressParseV2Dto` (rest optional).

PENDING: the run (`node scripts/load-baseline.mjs`), plus the still-open
T-QRY-06 `EXPLAIN` check that the `Phase8ParcelListIndex` migration covers
`(merchant, status, createdAt DESC)` and cursor `(createdAt DESC, id DESC)`
under the 250RPS staging goal (`docs/audit/pagination/parcel-list.md` §14).

## Item 3 — Resilience drills

- **Redis-down limiter spec** (`apps/api/test/rate-limit-redis-down.e2e-spec.ts`,
  NEW): boots the full app against a dead loopback Redis, asserts the cache
  driver reports `memory-fallback`, then 61 sequential tracking lookups under
  one identity → 60×404 + 1×429 with `Retry-After` + `RATE_LIMIT_EXCEEDED`.
  Gotcha documented in the spec: `resolveRedisUrl` ignores a localhost
  `REDIS_URL` while Upstash REST credentials exist, so the drill clears the
  Upstash vars too (else it would silently test Upstash and prove nothing).
  PENDING run.
- **Backup/restore drill** (owner-run checklist, scripts already exist):
  `scripts/backup-db.ps1` (pg_dump + SHA-256 + retention 7, `backups/` dir)
  → `scripts/restore-db.ps1` → `migration:show` (no pending) → seed-login
  smoke. Closes the MVP-gate "backup/restore is tested" line. PENDING run.
- **`metrics/prometheus` gate** (T-OPS-02, verified by read — endpoint exists
  at `health.controller.ts:167`, no `prom-client`, RED metrics
  `dhruto_http_requests_total/errors_total/latency_ms/rps`,
  `dhruto_db_up/latency_ms/pool_connections`, `dhruto_queue_jobs`,
  `dhruto_cache_hit_rate`, `dhruto_process_memory_bytes`). Remaining work is
  operational, not code: point a scraper at it and alert on `dhruto_db_up == 0`
  + `p95 > 300ms`. PENDING.

## Item 4 — Bulk-async decision (Q-BULK remainder)

Facts: `importBulk` is a sequential per-row `createParcel` loop capped at
`MAX_BULK_ROWS = 500` (`parcels.service.ts:1258`, `bulk-import.dto.ts:12`);
at ~50–200ms/row a full batch costs 25–100s of open HTTP — the ceiling that
motivates async. Transport available: BullMQ with `notifications` + `webhooks`
queues (`queues.module.ts`); `analytics-exports` is still unregistered
(T-API-04). Caveat: BullMQ workers log connection errors against Upstash
`rediss` at boot (observed in server logs) — any bulk queue inherits that
transport question.

Decision (no code in this phase):

1. **Now: chunked client-driven batches, zero server change.** The frontend
   splits >500-row files into ≤500-row `bulk/import` calls with namespaced
   batch keys (`<uuid>:part-N`, per-row `<key>:<index>`); idempotency already
   makes parts replay-safe. Works today.
2. **Later, on a real >500-row customer need: `bulk-import` BullMQ queue**
   (`POST /parcels/bulk/jobs` → 202 + job id; `GET .../jobs/:id` progress +
   per-row report download), reusing the existing `importBulk` row pipeline
   inside the worker. Gated on: (a) BullMQ-over-Upstash proof (or local-Redis
   topology decision), (b) T-API-04 queue-binding fix first so the pattern is
   proven on `analytics-exports`.
3. **Keep the sync 500 cap** until (2) lands; raising it without a worker
   just moves the timeout cliff.

## Regression status

No application runtime code changed in this phase (1 NEW script, 1 NEW
spec, load-harness edits, 2 docs). Nothing was executed per instruction —
first green runs of `phase9-verify.ps1`, the redis-down spec, and the
hardened harness are all owed and tracked in the master TODO.

## Deferred (unchanged)

Owner runs above; T-QRY-06 `EXPLAIN`; T-OPS-02 scrape/alert wiring; T-OPS-03
beyond the limiter drill; bulk queue build (needs a customer trigger +
transport proof); load-target sign-off.

## Next-phase preview (Phase 11 candidates)

1. **Execute + record**: `phase9-verify.ps1`, redis-down spec, hardened
   `load-baseline.mjs`, backup/restore drill — paste numbers into this doc
   and the master TODO.
2. **Close the exhausted TODOs**: T-OPS-02 (scrape), T-OPS-03 (drill done →
   verified), T-QRY-06 (`EXPLAIN` evidence), T-API-04 (queue binding — the
   prerequisite for any bulk-queue work).
3. **Demand-gated builds only**: bulk-async queue, auto-RTO, scan-mapping —
   nothing speculative before the verification backlog is green.
