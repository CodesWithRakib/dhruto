# Phase 6 — Bulk Import + Attempt Cap (implementation report)

> Owner-approved follow-up with documented defaults for Q-BULK (JSON rows, 500-row cap, batch-key idempotency) and Q-ATTEMPT-CAP (cap 5, 409 + hub RTO path, no silent auto-transition). CSV/XLSX file UI, higher caps, and auto-RTO remain owner-tunable. Disposable `dhruto_phase4` DB. No secrets printed. No migrations.

## B1 — Bulk import API (Q-BULK, backend slice)
- **Design (documented defaults):** `GET /parcels/bulk/template` (CSV columns + sample, no persistence), `POST /parcels/bulk/validate` (10/min; per-row server-pricing preview, persists nothing), `POST /parcels/bulk/import` (MERCHANT/ADMIN; 20/min — raised from 5 because writes are authenticated, attributed, per-row idempotent; brute force meaningless). Required batch `Idempotency-Key` (16–64 chars) derives per-row keys (`key:index`, always < 128-col limit); identical batch retry replays, one bad row never aborts the rest; per-row `{index, ok, parcelId/trackingCode | errorCode/message}`.
- **Files:** NEW `parcels/dto/bulk-import.dto.ts` (`MAX_BULK_ROWS=500`, nested `CreateParcelDto` validation — bulk rows obey single-booking rules byte-for-byte); `parcels.service.ts` (`validateBulkRows`, `importBulk` reusing `createParcel`); `parcels.controller.ts` (3 routes; no conflicts with `:id/*` shapes — verified by tests).
- **Not built:** CSV/XLSX file-upload UI (frontend converts to this payload; template endpoint supports it), async job for >500 rows (rejected with 422 + message; raise the constant when a worker is wanted).
- **Tests:** NEW `parcel-bulk.e2e-spec.ts` (5: template, dry-run, import+replay-no-dupes, key/budget/size rejections, boundary 422). Green.

## B2 — Delivery attempt cap (Q-ATTEMPT-CAP, conservative)
- `MAX_DELIVERY_ATTEMPTS = 5` (exported, tunable): 6th `failDelivery` → 409 `ATTEMPT_LIMIT_EXHAUSTED` (new contracts code, dist rebuilt) directing the parcel to hub RTO initiation (which now exists end-to-end). Count runs inside the parcel lock; successful `completeDelivery` counting untouched (completion never capped). Also replaced riders.service's local float `toMinor` with the exact `money.ts` version (same half-paisa class fixed in Phase 5).
- **Tests:** new case in `delivery.e2e-spec.ts` (5× fail → 409 with code). Green; existing fail/reschedule tests unaffected (≤2 attempts).

## Regression
| Check | Result |
|---|---|
| Full API suite (41 files) | **350/350** (344 + bulk 5 + cap 1) |
| Contracts 12/12, web unit 138/138 | green |
| API typecheck / ESLint / build | clean |
| Test-hygiene fix | RTO fan-out assertion hardened (per-parcel filter, stale-sub cleanup, 60s deadline) after a stale-DB timeout; relay backlog mechanics (25 rows/poll + inline HTTP attempts) documented — app behavior correct throughout, proven on fresh DB 6/6 |
| Rate-limit lesson | shared (Upstash) counters persist across reruns: bulk spec budgets exactly 5 import calls/file and documents the 60s-window constraint for future suites |

## Deferred (unchanged)
Q-BULK file UI + >500 async jobs; auto-RTO on cap (rejected in favor of explicit hub decision); RTO scan-mapping; Q-PROOF/Q-DUTY/Q-REASSIGN/Q-INTEL-restrict/Q-ONBOARD/Q-ROTATION; multi-instance limiter e2e; Playwright behavior pass; load targets.
