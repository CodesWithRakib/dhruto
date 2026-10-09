# Phase 5 — Money Exactness + Orphan Cleanup (implementation report)

> Decision-free scope only (bulk build, attempt-cap N, scan-mapping, rotation stay with owner). Disposable `dhruto_phase4` DB. No secrets printed. No migrations.

## T-FIN-01 — Minor-canonical money (closed VERIFIED, no storage rewrite)
- **Audit result:** all ledger math already runs on integers (`toMinor` in → integer ops → `toMajor` out, same tx); `Number()` uses are display projections; batch sums over minor bigints exact within 2^53. No drift path on 2dp-validated inputs.
- **Real half-paisa bug found + fixed:** `toMinor` used binary-float multiply, so `1.005 → 100` instead of 101 (1 poisha undercharge on x.xx5 inputs; DTOs don't check scale). Rewrote `money.ts` to exact string-decimal HALF_UP parsing (also fixes `0.1+0.2`-style artifacts).
- **Files:** `common/money/money.ts`; NEW `common/money/money.spec.ts` (6: exact HALF_UP incl. `1.005→101`, non-finite rejection, round-trip exactness, integer/positive asserts, net-payable floor, BDT format).
- **Tests:** 6/6 green; full finance suites green (no behavior shift on 2dp data).

## T-API-03 — `cancelSettlementBatch` routed (stranding bug fixed)
- **Root cause beyond orphan status:** the method set CANCELLED without clearing members' `batchId`, while `createSettlementBatch` requires `batchId IS NULL` — routing it as-is would strand settlements permanently.
- **Files:** `finance.service.ts` (transactional cancel + member release), `finance.controller.ts` (`POST /admin/finance/settlements/batches/:id/cancel`, ADMIN, 30/min).
- **Tests:** new case in `finance-ledger.e2e-spec.ts` (cancel → CANCELLED, re-cancel → 400, re-batch succeeds proving release). Green.

## T-INT-01 — Dead `getDefaultMerchant` removed
- Zero callers (returns arbitrary first merchant — tenant-confusion footgun). Deleted; typecheck/lint clean.

## Playwright-need check
- No web e2e/unit references the removed bulk nav, old hero statics, or new API routes → full Playwright run not required for Phase 4–5 changes (web unit 138/138 rerun green). Playwright remains the standing gap for any future frontend behavior change.

## Regression
| Check | Result |
|---|---|
| Full API suite (40 files) | **344/344** (337 + money 6 + batch-cancel 1) |
| Web unit (28 files) | 138/138 |
| API typecheck / ESLint / build | clean |
| One transient 343/344 observed mid-phase; two subsequent full runs green — recorded as flaky timing, not a defect (poll-based fan-out assertion on reused DB; test since hardened per-parcel) |

## Deferred (unchanged, owner decides)
Q-BULK build, Q-ATTEMPT-CAP (N + auto-RTO), RTO scan-mapping, Q-PROOF/Q-DUTY/Q-REASSIGN/Q-INTEL-SCOPE-rest/Q-ONBOARD/Q-ROTATION, multi-instance limiter e2e, Playwright behavior pass, load targets.
