# Phase 3 — Notification Fan-out Repair + P1 Workflow Gaps (implementation report)

> Approved scope: Phase 2 slices A–E. All tests on disposable `dhruto_phase0`. No secrets printed. No migrations, no rotation, no history rewrite.

## A1 — Fan-out repair (T-OBS-01) — DONE + VERIFIED
- **Root cause (confirmed):** `DomainEventPublisher.publish` persisted only `event.payload`, while the relay resolves recipients from `payload.merchantId` (`outbox-relay.service.ts:570,654-656`). 12/13 call sites omitted it (and route-critical `parcelId`, customer `recipientPhone`, finance template fields).
- **Files:** `events/publishers/domain-event-publisher.service.ts` (merge `meta.merchantId` under explicit keys — explicit values win); `events/domain/parcel.events.ts` + `finance.events.ts` (relay-contract fields, all optional); primary payloads aligned with their fallback siblings in `parcels.service.ts` (created/assigned), `riders.service.ts` (out-for-delivery/delivered/failed), `finance.service.ts` (payout ×4, cash-verified, settlement, discrepancy incl. hub/rider routing fields).
- **Deliberately not added:** new webhook event taxonomy for RTO (merchant-contract expansion needs owner sign-off); finance template content beyond relay-required keys (renders with safe fallbacks).
- **Tests:** NEW `domain-event-publisher.service.spec.ts` (3: backfill, no-clobber, multi-shape). **Previously-red `notifications-webhooks` test 7 now passes — suite 9/9.**

## A2 — Demo-seed gate (T-SEED-01) — DONE + VERIFIED
- `auth.service.ts` `onModuleInit` now skips when `NODE_ENV=production` without `SEED_DEMO_DATA=true` (extracted testable `shouldSeedDemoData`). Dev/CI behavior unchanged.
- Tests: NEW `auth-seed-gate.spec.ts` (4). No prod DB exists here; gate verified by unit + code.

## B — Validation hardening (T-VAL-01, T-EXC-01, T-IDEM-01) — DONE + VERIFIED
- `AssignRiderDto{riderId: IsUUID}` (new file) wired into `POST :id/assign-rider` (was raw `@Body`); existing `AddParcelToBagDto` wired into `POST bags/:id/parcels` (was raw `@Body`, could 500 on missing key).
- Exception re-resolve → 409 `EXCEPTION_ALREADY_RESOLVED` (new contracts code + rebuilt dist; `hubs.service.ts:1639-1650`).
- Parcel idempotency key length 16–128 now enforced (was Swagger-only); all existing callers already comply (helper keys + UUIDs).
- Tests: NEW `validation-hardening.e2e-spec.ts` (3: assign 422, bag-add 422×2, resolve→200→409 with code) + key-length cases in `parcels.e2e-spec.ts`. Green.

## C — Cancel + RTO initiation (T-CANCEL-01, T-RTO-01) — DONE + VERIFIED
- Policy = the existing lifecycle matrix (no invented rules): `POST /parcels/:id/cancel` (MERCHANT own via `assertOwnership`, ADMIN any; pre-pickup window; repeat = 200 replay) and `POST /parcels/:id/rto` (ADMIN/HUB_MANAGER; from DELIVERY_ATTEMPTED; repeat = 200 replay). Both write history rows in-transaction; no new event taxonomy (documented follow-up with Q-RTO program).
- Known limitation (documented, P2 follow-up): RTO initiation is role-checked but not hub-scoped to the parcel's current hub.
- Tests: NEW `parcel-cancel-rto.e2e-spec.ts` (4: cancel+replay+history, cross-merchant 404 + late-cancel 400, RTO+replay, merchant-403 + wrong-state-400). Green.

## D/E — Placeholders + dead nav (T-LIT-01, T-BULK-01) — DONE + VERIFIED
- `activeRiders/activeHubs` now distinct in-range scoped counts (`metrics.overviewActivity`); `bottlenecks` derived top-3 funnel dropoffs; intelligence hero strip bound to `GET /intelligence/health` (districts/thanas/model/dataset, "—" while loading; fabricated "100% carrier" card replaced with live dataset card).
- Dead `?mode=bulk` sidebar entry removed (`navigation.ts` + unused icon); dashboard keeps honest disabled "coming soon" card pending Q-BULK build decision.

## Regression (all green)
| Check | Result |
|---|---|
| Full API `vitest run` (38 files) | **332/332** (was 316/317; +15 new, +1 fixed) |
| Contracts tests | 12/12 |
| Web unit (nav/intelligence touched) | 138/138 (28 files) |
| API + web typecheck, API + web ESLint, API build, contracts build | clean/success |
| Phase 0 invariants (finance 22) + Phase 1 gate suites | still green inside full run |

## Decisions taken within approved scope (owner attention)
1. No new webhook event types (RTO notifications ride status visibility until Q-RTO program decision).
2. RTO initiation not hub-scoped to parcel hub (P2 follow-up proposed).
3. Finance template content gaps closed only to relay-required keys (cosmetic follow-up optional).
4. Bulk = nav removal, not build (Q-BULK build remains a proposal).
5. Minor-unit unification (T-FIN-01) deferred: round-trips exact on 2dp inputs; revisit post fan-out.

## Remaining / deferred (unchanged IDs)
Q-CANCEL/Q-RTO program details, attempt caps, photo/duty/reassign/intel-scope/onboarding/money-schedule/rotation questions (Phase 2 `05`); multi-instance live limiter e2e; Playwright suites; load targets.

**Phase 3 complete. Awaiting approval for merge and next phase (bulk build decision + RTO program + remaining P2s).**
