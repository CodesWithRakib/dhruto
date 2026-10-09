# Phase 4 — RTO Completion + Scoping Hardening (implementation report)

> Approved follow-up to Phase 3. Fresh disposable `dhruto_phase4` DB (migrated + seeded) for clean totals; `dhruto_phase0` retained untouched. No secrets printed. No migrations, rotation, or history rewrite.

## R1 — RTO advance + complete (T-RTO-01 continued)
- **Why:** Phase 3 opened RTO but left `RTO_INITIATED → RETURN_IN_TRANSIT → RETURNED_TO_MERCHANT` unreachable — same stuck-state class as before.
- **Files:** `parcels.service.ts` (`advanceRto`, `completeRto`: matrix-gated, replay-safe, history in-tx; `completeRto` emits the first-ever `ParcelReturnedEvent` with full relay payload + fallback append), `parcels.controller.ts` (`POST :id/rto-advance`, `POST :id/rto-complete`, ADMIN/HUB_MANAGER, 60/min), `events/domain/parcel.events.ts` (relay-contract fields).
- **Deliberately not added:** new webhook event taxonomy (reused existing `parcel.returned` targets); scan-mapped RTO legs (ops decision still open).
- **Tests:** extended `parcel-cancel-rto.e2e-spec.ts` (cross-hub 403, wrong-order 400, advance→complete→replay, per-parcel fan-out with signature + no-dup assertions). Full chain green on fresh DB (6/6).

## R2 — Hub-scoped RTO commands (P2 follow-up noted in Phase 3)
- `ParcelsService.assertRtoHubScope`: ADMIN bypass; HUB_MANAGER must hold an active `HubUserAssignment` on the parcel's `currentHubId` (direct repo, no module cycle — `HubsModule` already imports `ParcelsModule`). Null-hub parcels refused for non-admins. Applied to initiate/advance/complete.
- Tests: cross-hub 403 case in the RTO spec. Green.

## R3 — Alert scoping (T-SCOPE-01)
- `alerts.list(status, limit, hubIds?)`: hub managers see `platform` + own-hub rows only (single grouped predicate — no status-filter bypass); `acknowledge(id, actor, hubIds?)` enforces the same scope (403 otherwise). Admin paths unchanged. `listAlerts`/`ackAlert` resolve assignments via existing `hubAssignmentRepo`.
- Intelligence endpoint deliberately unchanged: aggregates carry no hub dimension and no tenant PII/money — recorded as accepted risk (restricting to ADMIN would be a product behavior change).
- Tests: NEW `analytics-alert-scope.e2e-spec.ts` (3: list excludes merchant scope, ack-403 on merchant scope, hub-ack-platform + admin-ack-anything). Green.

## Regression
| Check | Result |
|---|---|
| Full API suite, fresh DB (39 files) | **337/337** |
| API typecheck, API ESLint (incl. 1 pre-existing unused-var fixed + cross-hub assertion added), API build | clean |
| Disposable DBs | `dhruto_phase4` created/migrated/seeded for this phase; dev `dhruto` untouched |

## Test-hygiene notes
- The RTO fan-out assertion initially counted all `parcel.returned` rows and tripped on accumulated ACTIVE subscriptions from repeated runs on the reused DB; hardened to per-parcel filtering + no-dup-per-subscription assertions (correct on fresh and reused DBs). An early joint-run timeout on the stale DB was not reproduced on fresh DB; attributed to stale-state interference, documented here instead of hidden.
- Probe scripts used live in `C:\Users\RAKIB\AppData\Local\Temp\opencode\` (outside repo, no cleanup needed in tree).

## Deferred (unchanged)
Q-BULK build, attempt caps/auto-RTO, photo/duty/reassign/intel-restriction/onboarding/money-schedule/rotation decisions; multi-instance live limiter e2e; Playwright; load targets.
