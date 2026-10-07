# Metric Catalog

Single source of truth: `METRIC_CATALOG` in
`packages/contracts/src/analytics/phase7.schema.ts`. Frontend never
re-implements formulas.

| Key                          | Definition                                                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `total_parcels`              | `COUNT(parcels)` created in range                                                                                                                                                                                 |
| `delivery_success_rate`      | delivered / eligible × 100, where eligible = delivered + RTO-ladder + cancelled/lost/damaged + failed-attempt statuses. Pending/in-transit excluded (no outcome yet). `null` when eligible = 0 (no-data, not 0%). |
| `rto_rate`                   | RTO-ladder (`RTO_INITIATED`, `RETURN_IN_TRANSIT`, `RETURNED_TO_MERCHANT`) / eligible × 100                                                                                                                        |
| `average_delivery_hours`     | Mean `CREATED → DELIVERED` from `parcel_status_history` timestamps (never `updatedAt`), with P50/P75/P90/P95/P99                                                                                                  |
| `cod_collection_rate`        | collected / (collected + failed) × 100 from `cash_ledgers` + RTO parcel COD                                                                                                                                       |
| `rider_completion_rate`      | `DELIVERED` attempts / all attempts × 100 per rider                                                                                                                                                               |
| `hub_throughput`             | `RECEIVE_*` scans per hub per period; `DISPATCH_BAG` scans = dispatched; pending = non-terminal parcels at hub                                                                                                    |
| `first_attempt_success_rate` | attempt-1 `DELIVERED` / parcels attempted × 100                                                                                                                                                                   |

**Money**: minor units in API (`*_minor`), formatted to ৳ in UI.
**Finance**: read-only view; finance domain (wallets, journal, settlements)
is the source of truth — analytics flags, never repairs.
**RTO cost**: not tracked monetarily; reports show counts, rates and COD
exposure with an explicit `costNote` instead of invented costs.

## Time

Business timezone `Asia/Dhaka` everywhere; day buckets via
`AT TIME ZONE 'Asia/Dhaka'` + `date_trunc`. Presets: today, yesterday, 7d,
30d, month, last-month, 90d, custom (ISO datetimes, from ≤ to, ≤366 days).
Every range resolves an equal-length previous period for deltas
(30d vs previous 30d, never vs a calendar month).

## Limitations

- Latency cohorts cap at 20k rows (documented in code).
- `byZone` omitted from legacy RTO shape (no district→zone source at query
  time) — v2 exposes `byDistrict`.
- Prediction precision/recall require ≥10 labeled outcomes, else `null` +
  `insufficientData` (no misleading percentages).
