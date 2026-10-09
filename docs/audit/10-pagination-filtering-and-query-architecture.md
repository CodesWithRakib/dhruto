# 10 — Pagination, Filtering, Search & Sorting Architecture (RECOMMENDATION)

> Audit: `ParcelListQueryDto` carries offset (`page/limit/sort/order`) + `cursor` simultaneously; analytics `AnalyticsRangeQueryDto` (`preset/timezone/limit1-200`) vs legacy `AnalyticsQueryDto` (`period`); rider history fixed (`page1/limit100` frontend); webhooks/notifications paged; `useQueryState` + `useDebouncedValue` + `DebouncedSearchInput` are the reuse foundation. Do NOT force one mechanism everywhere.

## 1. Strategy decisions
| Surface | Recommended | Why | Counts? |
|---|---|---|---|
| Admin tables (parcels-admin, payouts, journal, settlements, failures, outbox, deliveries, alerts, reports) | **Offset** (`page/limit + total`) | Direct page jump, page numbers, filtered reports need exact totals; moderate sizes | yes |
| Merchant parcels (high-volume catalog) | **Offset default + cursor option** (consolidate DTO: `mode: offset|cursor`, mutually exclusive) | Users expect pages; cursor available for deep/export scrolling without `OFFSET` cost | offset yes; cursor no total (has `nextCursor`) |
| Tracking events / scans / history Timeline | **Cursor** (stable `createdAt + id` tie-breaker, base64 `opaqueCursor`) | Append-heavy, infinite scroll, deep offsets expensive | no total |
| Activity/notification feeds | **Cursor** | Same as above | no |
| Small lookups (hubs, destinations, models, versions) | **Non-paginated** (bounded arrays + `limit` cap) | Tiny cardinalities | no |

Cursor rules: stable order (`createdAt DESC, id DESC`), opaque base64url JSON (`{v:1, ts, id}`), validate + 400 on tamper, null-`ts` last, filters frozen in cursor (mismatch → 409 `CURSOR_FILTER_MISMATCH`), data-shift documented (skip `±1` acceptable, export uses snapshot id).

## 2. Shared contracts (add to `@dhruto/contracts`, reuse in Nest DTOs + RTK Query)
```ts
// query
PageParams { page>=1 default1, limit 1..100 default20 (analytics max200), }
CursorParams { cursor?: opaque, limit 1..100 default20 }
SortParams { sort: allowed-per-resource enum, order: asc|desc }
SearchParams { search?: string 1..100 (trimmed; per-resource searchable fields) }
DateRange { from?: ISO, to?: ISO (from<=to, max 90d default, tz Asia/Dhaka) }
EnumFilter { status?: enum[] } // comma-separated, validated
TenantScope // server-derived from JWT, never client param
// response
PageMeta { page, limit, total, totalPages, hasNext, hasPrev } // offset
CursorMeta { nextCursor: string|null, hasMore: boolean }       // cursor
```
HTTP: `GET ?page&limit&sort&order&search&status&district&thana&from&to[&cursor&mode]`; enums 400 on unknown; `limit` clamp + `X-Limit-Clamped` warn header (optional); `search` debounced 300ms frontend, min 2 chars (except tracking code exact); `Filter reset + clear-all` buttons; URL sync via `useQueryState` (extend validators); `sort` allowlist per resource (see `11`); `from/to` inclusive, tz-normalized server-side (`analytics-range.service.ts` reuse).

## 3. Layer responsibilities
- **Frontend utils:** `useQueryState` (add `getEnumArray`, `getDateRange`, cursor getters) + `useDebouncedValue(300ms)` + `table-toolbar` (filters) + `pagination.tsx` (offset) + new `infinite-list` (cursor, IntersectionObserver) — all in `@dhruto/ui` or `components/`.
- **API contract:** Zod schemas in contracts (`pageQuery`, `cursorQuery`, per-resource `filterSchema` + `sortEnum`); Nest DTOs `implements` them (fix divergences in `15`).
- **Backend:** `DhrutoValidationPipe` (400/422 shapes already) + service query-builder (tenant scope FIRST, then filters, then sort, then paginate) + `EXPLAIN` budget (see `13`).
- **DB:** keep Phase8 parcel index; add analytics range indexes per `15` DB-03; cursor requires `(createdAt DESC, id DESC)` composite per feed.

## 4. States (standardize)
Loading (skeleton/table shimmer) → Empty-filtered (`SearchX + clear`) vs Empty-none (`Package + create`) → Error (`ErrorState + Retry`, `getApiErrorMessage`) → Out-of-range offset (last page + toast) → Cursor-exhausted (no spinner). All lists already follow this via `feedback/states` — codify in Storybook/contract tests.

## 5. Cache keys + invalidation
RTK Query: `providesTags` per id + `LIST:{resource}:{tenant}:{hash(filters+sort+page/cursor)}`; mutations invalidate `LIST` + affected `id` (create → LIST; verify/approve → LIST + detail). Server cache (`wrap 120-180s` analytics) keyed by `(tenant, range, filters)`; purge on alert-ack/report-request (already uncached writes).

## 6. Migration plan (consolidate without breaking clients)
1. Add `mode` + cursor validators to `ParcelListQueryDto` (backward-compat: no `mode` = offset). 2. Split analytics legacy vs v2 docs (deprecate legacy `period` in Swagger, keep 2 majors). 3. Unfix rider history (`page/limit` params). 4. Port all lists to shared `useQueryState` validators (one PR per role). 5. `EXPLAIN` + indexes. 6. Contract tests (offset meta + cursor round-trip + filter-mismatch). Exit: no dual-shape ambiguity; every list in `11` states its strategy.
