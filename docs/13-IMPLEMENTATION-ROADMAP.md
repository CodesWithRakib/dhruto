# Dhruto — Implementation Roadmap

## Phase 0 — Foundation

### Backend

- Monorepo
- NestJS bootstrap
- Config
- PostgreSQL
- Redis
- Swagger
- Global validation
- Error contract
- Request ID
- Logging
- Auth foundation
- RBAC foundation

### Frontend

- Next.js apps
- Shared UI
- Theme tokens
- API client
- RTK Query
- Auth flow
- Layout system

### Exit Criteria

- all apps build
- API health works
- database migration works
- auth works
- CI works

---

## Phase 1 — Merchant + Parcel Core

### Backend

- merchants
- parcels
- parcel history
- pricing
- idempotency
- labels
- tracking

### Frontend

- merchant dashboard
- create order
- order list
- order details
- tracking
- label print

### Exit Criteria

Merchant can create and track a parcel end-to-end.

### Status — implemented

Delivered as a vertical slice: DB -> NestJS -> API -> RBAC -> frontend.

| Area        | Delivered                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Database    | `parcels`, `parcel_status_histories` (append-only), `idempotency_records` (unique `(key, scope)`); migrations run via `migration:run`           |
| API         | `POST/GET /parcels`, `GET /parcels/:id`, `GET /parcels/:id/history`, `GET /parcels/:id/label`, `GET /tracking/:code`, `POST /pricing/calculate` |
| RBAC        | Merchant ownership enforced server-side; client-supplied `merchantId` is never trusted; cross-tenant reads return 404                           |
| Idempotency | `Idempotency-Key` mandatory on create; DB-unique guard; replay / conflict / in-progress                                                         |
| Pricing     | Decimal-safe integer paisa, `PRICING_RULES_VERSION = 2026.1`; the client never computes a fee                                                   |
| History     | Append-only status history written in the same transaction as the parcel                                                                        |
| Labels      | Code128 SVG from the API rendered on a 4in x 6in thermal label with print CSS                                                                   |
| Tracking    | Public endpoint returns safe fields only (no merchant or financial data)                                                                        |
| Frontend    | Dashboard, booking form with live quote, paginated/searchable list, details with timeline, label print, public tracking                         |
| i18n        | EN + BN catalogs with matching key sets                                                                                                         |
| Mobile      | Bottom nav, card list, filter sheet; no horizontal page scroll                                                                                  |

Verified commands (run from the repository root unless noted):

```text
pnpm typecheck   # 6/6 tasks
pnpm lint        # 6/6 tasks
pnpm build       # 4/4 tasks
pnpm test        # 5/5 tasks (API 148 tests, web 16 tests)
pnpm test:e2e    # 3/3 tasks (Playwright 28 tests: chromium + mobile-chrome)
cd apps/api && npm run migration:run   && npm run migration:show   # no pending
cd apps/api && npm run seed                                    # idempotent
```

Spec reconciliations (documented, not silent divergences):

- `ORDER_CREATED` in the spec is implemented as `CREATED`
  (`INITIAL_PARCEL_STATUS`); see [State Machine](./08-STATE-MACHINE.md).
- `SUPER_ADMIN` is covered by the existing `UserRole.ADMIN`, which bypasses
  role checks.
- `canTransition` follows `08-STATE-MACHINE.md` §2, with one named and tested
  exception: `PRE_PICKUP_RIDER_ASSIGNMENT_FROM = [CREATED, PICKUP_REQUESTED]`
  -> `ASSIGNED_TO_RIDER`.
- `GET /parcels` flattens the page envelope onto `meta`; see
  [API Specification](./05-API-SPEC.md) §5.

Known gaps carried into Phase 2:

- Bulk parcel ingestion (`POST /parcels/bulk/validate`, `bulk/import`) is
  stubbed in the UI as a future feature and not implemented on the API.
- Redis is optional at runtime; the API falls back to an in-memory TTL/LRU
  cache for rate limiting and tracking lookups.

---

## Phase 2 — Hub Operations (implemented)

### Backend

- hubs (`GET /hubs`, `/hubs/destinations`, `/hubs/:id`, dashboard, inventory)
- scans (`POST /hubs/:id/scans` with idempotency keys, append-only `parcel_scans`)
- parcel lookup (`GET /hubs/:id/parcels/:trackingCode`, operational fields only)
- bags (`POST /hubs/:id/bags`, `GET /bags`, `/bags/:id`, add-parcel, seal)
- manifests (`POST /hubs/:id/manifests`, `GET /hubs/:id/manifests`,
  `/manifests/:id`, dispatch, reconciled receive)
- exceptions (`GET /exceptions`, resolve with note)
- state transitions via the centralized `ParcelLifecycleService`
- hub permissions (`HubUserAssignment` + `HubPermission`, never trusted from client)
- per-operator rate limits on scan/bag/dispatch/receive mutations

### Frontend

- hub dashboard with live metrics (`/hub/dashboard`)
- continuous scanner with idempotency, audio + text feedback (`/hub/scanner`)
- parcel lookup + inventory (`/hub/parcels`)
- bag management, details, sealed-membership freeze (`/hub/bags`, `/hub/bags/[id]`)
- manifest creation, confirmed dispatch, reconciled receive (`/hub/manifests`,
  `/hub/manifests/[id]`)
- exception review and resolve (`/hub/exceptions`)
- full English + Bangla catalog (166 Hub keys, parity unit-tested)

### Exit Criteria

A parcel can travel through origin and destination hub workflows. Verified by
`apps/api/test/hubs.e2e-spec.ts` (9 tests incl. concurrency) and Playwright hub
journeys (`hub-inbound`, `hub-bagging`, `hub-dispatch-receive`, `hub-mobile`,
`hub-bn-spot`) run in Brave against the real backend and database.

---

## Phase 3 — Rider Delivery (implemented)

### Backend

- rider codes (`RDR-######`, unique, centrally generated)
- hub-scoped assignment with eligibility, hub-match and controlled reassignment
- delivery tasks via parcel ownership + `ParcelAssignment` audit trail
- append-only `delivery_attempts` log (also the proof-of-delivery record)
- hashed OTPs (bcrypt, 15 min TTL, 5-attempt lockout, 60 s resend cooldown,
  max 5 per leg; secret never persisted, logged, or returned in production)
- exact COD matching, operational cash liability only (no wallet settlement)
- idempotent completion (`Idempotency-Key` + recorded-delivery replay)
- rider duty gating, terminal dashboard/history/profile endpoints
- hub/admin fleet list + detail with task counts and assignment history
- per-operator rate limits on start/OTP/complete/fail/hand-in

### Frontend/PWA

- rider dashboard with live metrics (`/rider/dashboard`)
- task list with search + filters (`/rider/tasks`)
- handoff screen: start, server-verified OTP + resend, exact COD, idempotent
  complete, validated fail/reschedule, attempt trail (`/rider/tasks/[id]`)
- delivery history (`/rider/history`), profile + duty + cash hand-in
  (`/rider/profile`)
- hub parcel-lookup assignment + admin fleet operations
- full English + Bangla catalog (122 Rider keys, parity unit-tested)
- existing PWA (manifest + rider shortcut, service worker, offline page);
  completion always requires server confirmation, nothing sensitive cached

### Exit Criteria

Rider can complete a real delivery workflow. Verified by
`apps/api/test/delivery.e2e-spec.ts` (19 tests incl. OTP/COD/concurrency/
security) and Playwright rider journeys (`rider-login`, `rider-delivery`,
`rider-mobile`, `rider-bn-spot`) run in Brave against the real backend.

---

## Phase 4 — Finance (implemented)

### Backend

- double-entry journal (`financial_transactions` + `financial_entries`,
  minor-unit integers, balance-enforced, immutable, idempotent)
- money library (poisha integers, centralized BDT constant)
- parcel settlements + settlement batches (fee snapshots, journal links)
- rider hand-in batches (server-computed totals) + hub verification
- cash discrepancies (SHORT/OVER preserved, reasoned resolution)
- payout state machine (approve/process/fail/reject/cancel) with reservation
  postings, idempotency keys and masked destinations
- manual adjustments + mirror-entry reversals
- authorization overhaul (guards on every finance route, no fallback
  merchant, hub scoping, admin console)
- reports (COD/payout/fee, filters, CSV) + automated reconciliation check
- ledger adoption opening balances (migration + seeder)

### Frontend

- merchant wallet, paginated statement, settlements, payout request with
  review step and idempotency, payout history with cancel
- hub cash desk (`/hub/cash`): pending, batches, discrepancies, verified
  verify-with-confirmation flow
- rider hand-in batch history on the profile
- admin finance console: overview, payouts, settlements + batches, journal +
  reversals, adjustments, discrepancies, reports, reconciliation check
- full English + Bangla (130 Finance keys, parity-tested)

### Exit Criteria

COD can be reconciled and merchant settlement is correct and auditable.
Verified by `finance.e2e-spec.ts` (9) + `finance-ledger.e2e-spec.ts` (13:
auth, invariants, discrepancy, payout machine, idempotency, concurrency,
adjustments, reversals, reconciliation check, reports) and Playwright
finance journeys (`finance-merchant`, `finance-hub`, `finance-admin`,
`finance-mobile`, `finance-bn-spot`) run in Brave against the real backend.
See `docs/phases/phase-4-finance.md`.

---

## Phase 5 — Notifications + Integrations

- SMS
- email
- in-app notifications
- webhooks
- queue workers
- retry/dead-letter handling

---

## Phase 6 — Intelligence

- address parser
- district/thana matching
- confidence scoring
- recipient risk score
- RTO prediction
- operational recommendations

---

## Phase 7 — Analytics

- operational dashboard
- merchant analytics
- hub throughput
- rider performance
- RTO analytics
- COD analytics
- financial analytics

---

## Phase 8 — Scale and Optimization

- load testing
- DB query optimization
- cache optimization
- queue optimization
- horizontal scaling
- observability
- disaster recovery

---

## Implementation Rule

Do not start advanced AI, route optimization, or complex analytics before the transactional core is stable.

The priority order is:

```text
Correctness
→ Security
→ Maintainability
→ Observability
→ Performance
→ Advanced Intelligence
```

## Feature Delivery Checklist

Every feature must answer:

1. What business problem does it solve?
2. Who can use it?
3. What API is required?
4. What DB changes are required?
5. What state transitions are involved?
6. What validation is required?
7. What financial impact exists?
8. What audit event exists?
9. What notifications exist?
10. What errors can happen?
11. What tests are required?
12. What frontend states exist?
13. What performance risks exist?
14. What documentation must change?

## Final MVP Gate

MVP cannot be considered production-ready until:

- critical E2E journeys pass
- state machine tests pass
- financial concurrency tests pass
- idempotency tests pass
- security checks pass
- load-test baseline is recorded
- backup/restore is tested
- monitoring is active
- audit logs are verified
- API documentation matches implementation
