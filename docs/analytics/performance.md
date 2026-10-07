# Dashboard Architecture & Performance

## Layers

```
Transactional tables (source of truth)
  → AnalyticsMetricsService / AnalyticsDomainService (aggregate GROUP BY,
    tenant-scoped at query layer, history timestamps for durations)
  → Analytics API (aggregated envelopes; 120–180s tenant-scoped Redis cache)
  → Dashboards (display only; no business math in React)
```

No aggregate tables: measured latencies (below) did not justify read models
on current data volumes. Revisit when P95 exceeds budget on production data.

## Frontend

- One chart solution: `TrendLineChart` + `GroupedBarChart` SVG primitives in
  `@dhruto/ui` (theme tokens, `hsl(var(--…))`, aria-labeled, empty states).
- Reusable `MetricCard` (value/previous/delta, no-data vs zero),
  `FilterBar` (URL-synced presets + custom), `ExportButton`.
- Admin: overview + 12 section routes (`/admin/analytics/[section]`).
  Merchant: isolated dashboard. Generic `/analytics` routes by role.
- All pages `noindex`; EN/BN via `next-intl`; loading/empty/error states;
  mobile stacked cards, scrollable tables, no page-level horizontal overflow.

## Access

Merchant → own scope (query `merchantId` honored for ADMIN only).
Hub manager → assigned hubs (403 otherwise). Rider → own record.
Admin → platform + comparison. Exports enforce identical scoping + ownership.

## Performance (measured, dev dataset ~50 parcels, cold cache)

| Endpoint (30d)                      | Measured |
| ----------------------------------- | -------- |
| `GET /analytics/overview`           | 156ms    |
| `GET /analytics/parcels`            | 35ms     |
| `GET /analytics/hubs`               | 45ms     |
| `GET /analytics/riders`             | 165ms    |
| `GET /analytics/rto/v2`             | 53ms     |
| `GET /analytics/cod/v2`             | 31ms     |
| `GET /analytics/finance`            | 47ms     |
| `GET /analytics/notifications`      | 34ms     |
| `GET /analytics/intelligence` (90d) | 51ms     |

Budgets: simple KPI P95 < 500ms, dashboard P95 < 1s, large exports async
(BullMQ `analytics-exports`, idempotent per export id, 72h expiry).
Cache keys include role + scope + range + metric version
(`analytics:<domain>:v1:…`); merchant isolation verified by test
(cross-tenant totals differ; export download 403).
Query notes: aggregate `GROUP BY` only, select minimal columns, bounded
`take()` on listings, per-hub/per-rider loops bounded (100 hubs / 50–200
riders). No `EXPLAIN ANALYZE` regressions found on dev data; re-run on
production-scale volumes before adding indexes or read models.

## Alerts

Deterministic rules (`DEFAULT_ALERT_DEFINITIONS`), one OPEN row per
`alertKey:scope:day` dedup key, auto-resolve when clear + 7-day stale
hygiene, CRITICAL → admin in-app via Phase 5 notifications. ACK audited.
