# Phase 2 — 06 Test Coverage Plan (exact; reuse noted)

## New unit tests
- U1 Relay payload contract: for each `DomainEventType` with FANOUT webhook/merchant targets, assert published outbox payload contains `merchantId` (+ `parcelId` where routes need it). Reuse: `outbox-relay.service.ts` FANOUT table as oracle. (Covers D1; fails today.)
- U2 `buildAuthConfig` production cases (exists — `auth.config.spec`, reuse).
- U3 Key-length validator (after D9 fix). U4 Re-resolve guard (after D7 fix). U5 Lifecycle cancel transitions (exists — extend when D4 lands).

## New integration tests (Nest + disposable DB)
- I1 DTO validation: malformed `riderId`/`parcelTrackingCode` → 422 (after D5 fix).
- I2 Demo-seed gate: boot with `NODE_ENV=production` → no demo rows created (after D2 fix). Careful: needs isolated module boot, not the shared DB.
- I3 Cancel endpoint matrix (after D4 + Q-CANCEL): allowed triple → CANCELLED + history; late cancel → 400/403.
- I4 Return initiation (after D6 + Q-RTO): fail→RTO→transit→returned + idempotent duplicate return → 409.
- I5 Hub-scoped intel/alerts (after scoping decision Q-INTEL-SCOPE).

## New E2E / concurrency
- E1 Webhook+in-app fan-out per event type (extends `notifications-webhooks` test 7 pattern; currently red — will pass after D1).
- E2 Attempt-cap/auto-RTO (after Q-ATTEMPT-CAP/Q-RTO).
- E3 Bulk import job (only if Q-BULK = build).

## Regression (reuse every phase)
- R1 Phase 0: `finance-ledger` (13) + `finance` (9). R2 Parcels/delivery/hubs (29/19/9). R3 Auth security: `auth-rate-limit` (3) + `auth-guards` (7) + `auth-and-rider` (14). R4 `notifications-webhooks` (9 — expect 9/9 after D1). R5 Full `vitest run` before any merge.
