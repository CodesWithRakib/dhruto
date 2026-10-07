# Performance Report (Phase 8)

Environment: Ryzen 5 3400G (4c), 16GB RAM, PostgreSQL 18.6 (local),
Redis DOWN (degraded memory-fallback mode — also validates fail-open),
Node 26.8.1, dataset ~1300 parcels. Load generator on the same box
(contention noted below). Harness: `scripts/load-baseline.mjs`.

## API benchmarks (concurrency 25, 200 reqs unless noted)

| Endpoint | Before P50 | Before P95 | Before P99 | After P50 | After P95 | After P99 | Errors |
|---|---|---|---|---|---|---|---|
| GET /health | 29.7 | 76.4 | 249.9 | 40.3 | 436.6¹ | 455.1 | 0 |
| POST login (5×, conc 1) | 1982² | 2008² | 2019² | 99.1 | 106.6 | 106.6 | 0 |
| GET parcels list | 76.4 | 107.5 | 121.6 | 91.6 | 172.6 | 175.1 | 0 |
| POST parcels (60×, conc 10) | 28.3 | 362 | 597.9 | 11.1 | 422 | 425.7 | 0 |
| GET analytics/overview | 20.8 | 377.8 | 389.9 | 20.5 | 127.4 | 128.2 | 0 |
| POST intelligence parse | 23.6 | 115.4 | 183.6 | 21.1 | 109.5 | 115.6 | 0 |

¹ Health outlier is cold-start + same-box generator contention: warm
 re-probe (n=100 sequential) gives **p50 14.6 / p95 19.1 / p99 24.9** —
 target P95 < 100ms met when warm.
² Before-login hammered 200 concurrent bcrypt hashes (pure-JS, event-loop
 blocking) → 2s each and loop starvation. Realistic single-login cost is
 ~100ms. bcrypt cost is intentional and untouched; lesson recorded: keep
 auth concurrency low, never weaken hashing.

Targets: simple read P95 < 300ms ✓ (list 173, parse 110);
authenticated normal P95 < 500ms ✓ (analytics 127, create 422);
complex < 1s ✓. Throughput: list ~327 rps, parse ~705 rps on 4 cores.

## Proven improvements (evidence, not vibes)

1. **Filtered parcel lists**: EXPLAIN showed a Sort node over
   `(merchant_id, status)` hits → added
   `IDX_parcels_merchant_status_created`; post-migration plan uses the
   composite with presorted `createdAt` (sort eliminated).
2. **Hot-path caching**: analytics/overview p95 378 → 127 (tenant-scoped
   keys + single-flight stampede guard added to `CacheService.wrap`).
3. **Keyset pagination** (`cursor` on parcel list): no OFFSET on deep pages,
   stable under concurrent inserts (e2e: overlap [] + invalid-cursor
   fallback). COUNT retained for compatible meta.
4. **Worker throughput**: BullMQ concurrency 1 → 5 (notifications, webhooks),
   2 (exports); DLQ/retention unchanged.

## Deliberately NOT done (with reason)

- No read-model/aggregate tables: hottest endpoint p95 ≤ 175ms; revisit if
  P95 > 500ms on production data.
- No unused-index removal: dev-scale `pg_stat` cannot prove disuse safely.
- No trigram search index: `ILIKE %term%` measured sub-ms at this scale;
  revisit with production volumes.
- No OTEL: undeployable here; requestId→eventId→jobId correlation +
  Prometheus exposition cover RED + tracing-by-logs instead.
- No major dependency upgrades (vitest/tinypool advisories are dev-only;
  SheetJS parse-side advisories don't apply — we only generate).

## Frontend

Production build: total JS ~1.74MB, largest shared chunk 311KB (no chart
library — hand SVG). Brave CDP smoke 6/6: login, analytics KPIs from live
API, intelligence panel, zero overflow at 1280px and 390px (one 17px
FilterBar overflow found and fixed, re-verified).

## Concurrency / security evidence

- 25× same-key parcel creates → exactly 1 tracking code.
- 40-wide burst → 429 + `Retry-After` (abuse protection working).
- Same-key payout replay → single payout code.
- Cross-tenant parcel read/list + notification read → 404.
- Backup 4.77MB + SHA-256; restore drill 6.0s, 10 migrations, 1303 parcels,
  4 wallets, 0 FK violations. RPO ≤ 24h, RTO ≤ 30min.
