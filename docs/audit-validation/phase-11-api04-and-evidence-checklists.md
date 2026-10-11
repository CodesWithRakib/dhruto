# Phase 11 — T-API-04 Close-Out + Query/Scrape Evidence Checklists

> Per standing owner instruction (code-only, no runs): no servers started, no
> test, build, typecheck, lint, or query executions. One app-code change below
> (dead-code deletion + comment, provably behavior-neutral by read); the rest
> is verified-by-read documentation plus owner-run checklists.

## T-API-04 — CLOSED (code + verified-by-read)

Sub-item 1, **rider scoping** (`analytics.controller.ts:531-547`): fixed.
`GET /analytics/riders/me` is RIDER-only, `riderIdFor` 404s callers without
a rider profile, `riderStats` returns `riderId: rider.id` (metrics service
`:449`) so the `.find()` matches exactly, and the response carries only the
caller's own row. Scope held already — the stray `void riderId;` suggested
otherwise. Deleted the dead statement and recorded the threefold scoping
argument in a comment. No behavior change possible (deletion of a no-op).

Sub-item 2, **`analytics-exports` queue binding**: verified, no change.
Registered (`analytics.module.ts:71`), processor provided in the same module
(`:82`, `@Processor("analytics-exports")`), service injects optionally with
a sync inline path for ≤5k rows (`analytics-export.service.ts:65,105-107`).
Wiring is complete; live job proof (enqueue a >5k-row export on a disposable
DB, assert completion + in-app notification) is an owner run — folded into
`phase9-verify` follow-up scope, not this phase.

Sub-item 3, **`system/*` prefix**: verified, deliberately NO change. The
frontend admin health card calls `/api/v1/system/metrics`
(`observability.api.ts:8` on the `/api/v1` baseApi) — the prefixed `system/*`
routes are load-bearing UI plumbing. `main.ts` excludes only `health/*` from
the global prefix so orchestrators get unprefixed probes while the app keeps
its in-prefix observability namespace; both names serve the same controller
(`health.controller.ts:19`) by design. "Fixing" the exclude would 404 the
admin console. Closed as investigated, evidence above.

## T-QRY-06 — EXPLAIN checklist (owner-run, queries derived from the implementation)

Run against a seeded disposable DB (`EXPLAIN (ANALYZE, BUFFERS)`), paste
plans into this doc. Query shapes mirror `parcels.service.ts:499-568`
(column names are the entity columns: `merchant_id`/`merchantId` →
`"merchant_id"`, `"status"`, `"createdAt"`):

```sql
-- Q1 offset default: merchant + status, newest first.
-- Expect: Index Scan using IDX_parcels_merchant_status_created, no Sort node.
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM parcels
WHERE merchant_id = '<merchant-uuid>' AND status = 'CREATED'
ORDER BY "createdAt" DESC LIMIT 20;

-- Q2 keyset cursor: merchant + (createdAt, id) tuple, fetch limit+1.
-- Expect: served without a Sort node. If a Sort appears, the cursor path
-- wants the candidate composite below (Phase 12 migration, NOT this phase).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM parcels
WHERE merchant_id = '<merchant-uuid>'
  AND ("createdAt" < '2026-10-01T00:00:00Z'
       OR ("createdAt" = '2026-10-01T00:00:00Z' AND id < '<uuid>'))
ORDER BY "createdAt" DESC, id DESC LIMIT 21;

-- Q3 analytics range (representative): attempt history per parcel window.
-- Expect: Index Scan using IDX_33f97a9c53955a85c5eaed5295, no Seq Scan.
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM parcel_status_histories
WHERE parcel_id = '<parcel-uuid>' AND "createdAt" BETWEEN '2026-09-10' AND '2026-10-10'
ORDER BY "createdAt" ASC;
```

Candidate DDL if Q2 sorts (proposal only — create + measure in Phase 12):

```sql
CREATE INDEX IF NOT EXISTS "IDX_parcels_merchant_created_id"
  ON "parcels" ("merchant_id", "createdAt" DESC, "id" DESC);
```

Existing coverage for reference: `IDX_parcels_merchant_status_created
(merchant_id, status, createdAt DESC)` (Phase 8), `(merchant_id, createdAt)`,
`(merchant_id, district)`, `(merchant_id, status)` (Phase 0/1).

## T-OPS-02 — scrape checklist (owner-run)

`GET /health/metrics/prometheus` exists (`health.controller.ts:167`, no
`prom-client`, `Content-Type: text/plain; version=0.0.4`). Owner run:

1. `curl -s http://localhost:4000/health/metrics/prometheus` — expect the
   exact metric names verified by read: `dhruto_http_requests_total`,
   `dhruto_http_errors_total`, `dhruto_http_latency_ms{quantile=…}`,
   `dhruto_http_rps`, `dhruto_db_up`, `dhruto_db_latency_ms`,
   `dhruto_db_pool_connections{state=…}`, `dhruto_queue_jobs{queue=…}`,
   `dhruto_cache_hit_rate`, `dhruto_process_memory_bytes{area=…}`.
2. Scrape config (drop-in, 15s interval):

```yaml
scrape_configs:
  - job_name: "dhruto-api"
    static_configs:
      - targets: ["localhost:4000"]
    metrics_path: "/health/metrics/prometheus"
    scrape_interval: 15s
```

3. Minimum alerts (the T-OPS-02 "gate"):

```yaml
groups:
  - name: dhruto
    rules:
      - alert: DhrutoDbDown
        expr: dhruto_db_up == 0
        for: 1m
      - alert: DhrutoSlowResponses
        expr: dhruto_http_latency_ms{quantile="0.95"} > 300
        for: 5m
```

## Still pending (unchanged, owner-run)

`phase9-verify.ps1` (Brave journey + multi-instance spec), redis-down spec,
hardened `load-baseline.mjs`, backup/restore drill, the two checklists above.

## Regression status

One no-op deletion + comment in `analytics.controller.ts`; everything else
is docs. Nothing executed per instruction. The deletion cannot alter behavior
(`void <used-variable>` emits no code, removes no code path); the risk it
carries is a lint rule about unused expressions disappearing with it —
visible on the next owner-run lint, trivially revertible.

## Deferred (unchanged)

Cursor composite index (needs Q2 evidence first); bulk-async queue (needs a
customer trigger + BullMQ transport proof); auto-RTO; scan-mapping.

## Next-phase preview (Phase 12 candidates)

1. **Execute + record everything pending**: `phase9-verify.ps1`, redis-down
   spec, load harness, backup/restore, Q1–Q3 EXPLAIN plans, scrape curl —
   paste outputs here and in the master TODO.
2. **Cursor index decision**: if Q2 sorts, add + measure the candidate
   composite; if not, close T-QRY-06 with the plans as evidence.
3. **First demand-gated build**: only whichever of bulk-queue / auto-RTO /
   scan-mapping has a real trigger; nothing speculative.
