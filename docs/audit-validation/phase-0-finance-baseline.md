# Phase 0 — Finance Integrity Verification & Runtime Baseline

> Verification-only. No application source, test, migration, or expected-result was changed in this phase (`git status` shows only pre-existing `M apps/web-merchant/next-env.d.ts` plus prior-phase staged `docs/audit/`; this phase adds only `docs/audit-validation/`). No production data or real external financial operation was affected. No secret values are printed; only configuration key names.

## A. Environment verification

- **Test environment:** Windows host, Node v26.8.1, repo `C:\Sofof_tech_2026\dhruto`, API package `@dhruto/api` (Nest 11 + TypeORM 0.3 + Vitest 3.2.7 + supertest, `vitest.config.ts`: `src/**/*.spec.ts` + `test/**/*.e2e-spec.ts`, `fileParallelism:false`, 30s timeouts). `NODE_ENV=development` (from `apps/api/.env`; key names only inventoried, values never printed).
- **Database isolation — CONFIRMED disposable:**
  - App default target is database `dhruto` (parsed name only, from `DATABASE_URL`/`DB_DATABASE` config keys). It was NOT used.
  - Created NEW database `dhruto_phase0` (`CREATE DATABASE`, verified 0 tables before migrate). All 10 migrations applied to it (`MigrationCLI Applied migration` ×10: InitialSchema … Phase8ParcelListIndex). Seeded via `seed-cli.js` → 5 hubs, 11 users, 3 merchants, 3 wallets, 3 riders, 37 parcels, 213 status histories, 6 cash ledgers, 6 wallet tx, 3 payouts, 5 notifications, 8 delivery attempts, geo 64/242, 1 webhook subscription. Seeder contains no `delete/remove/clear/TRUNCATE/DROP` (grep verified).
  - Every test run overrode `DATABASE_URL` in the shell to `…/dhruto_phase0` (Nest `ConfigModule` real-env-wins over `.env` file). Post-run isolation probe: `dhruto_phase0` holds 77 parcels incl. 10 `Finance Four%` test rows; dev `dhruto` holds 1992 parcels incl. 242 pre-existing `Finance Four%` rows from earlier dev activity — **zero new rows attributable to this session** (the single misconfigured attempt failed with `Invalid URL` at pool creation, `beforeAll` never ran; see C.0). No reset/truncate/drop/reseed of any existing database occurred.
  - `synchronize=false`, `migrationsRun=false` (explicit `migration:run` only) — see `database.config.ts`, `data-source.ts`.
- **Configuration keys involved (names only):** `NODE_ENV`, `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_STATEMENT_TIMEOUT_MS`, `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`. `apps/api/.env` has NO `SMS_*/EMAIL_*/WEBHOOK_*/OUTBOX_*/INTELLIGENCE_PHONE_PEPPER` keys → provider defaults apply.
- **External integrations — mocked or inert by construction:**
  - SMS (`sms.service.ts`) and email (`email.service.ts`) are **log-only stubs** (no HTTP client, bodies never logged) — real sends impossible.
  - Webhooks: seeded subscription is `INACTIVE` at host `example.com` (queried host + status only); finance/parcel suites create no subscriptions → `attemptDelivery` never fires externally.
  - Payout `process` flips ledger-local state only (no bank integration exists — manual refs).
  - Redis: localhost unreachable; `CacheService` logged `Redis not available. Initialized resilient in-memory TTL/LRU` and `queue-helper.enqueueOrInline` falls back to inline. BullMQ is configured with hosted `rediss://…upstash.io` (masked in logs); test payloads are synthetic either way. Recorded as a limitation, not a blocker.
- **Destructive-command review:** tests contain no `remove/delete/clear/TRUNCATE/DROP`; `afterAll` only `app.close()` (test rows persist in the disposable DB by design). Migration `down` paths (with `DROP`) were never invoked. `scripts/` load tests were not run.

## B. Ledger invariant matrix

Implementation evidence: `finance/ledger/ledger.service.ts` (balanced-input assert, idempotency claim-in-tx, immutable `POSTED` tx, `FIN-######` retry-on-`23505`), `finance/finance.service.ts` (every money op in `dataSource.transaction` with `pessimistic_write`; payout guards `REQUESTED→APPROVED→COMPLETED/REJECTED/FAILED`, cancel-only-REQUESTED; masked account numbers), `common/money/money.ts` (minor units), entities (`FinancialEntry RESTRICT→Transaction`, UQs: `transaction_code`, `(merchantId,idempotency_key)` on payouts, `parcel/ledger UQ` on settlements, `cash_ledger UQ` on discrepancies), `T-DB-01`: zero `.remove(` in finance/parcels/riders/hubs/merchants.

| ID | Invariant (expected + evidence) | Impl files | Existing coverage | Verification performed | Observed result | Status | Remaining risk |
|---|---|---|---|---|---|---|---|
| INV-01 | Ledger + entries + wallet updates persist atomically (single DB tx) | `ledger.service.ts:post`, `finance.service.ts` tx blocks | ledger balanced-post test; finance journey | Ran `finance-ledger` (13) + `finance` (9) on disposable DB | 22/22 green; no partial-post failure observed | PASS | Crash-mid-tx (kill -9) untested |
| INV-02 | Every journal balances (ΣDEBIT==ΣCREDIT, positive integer minor) | `ledger.service.ts:assertBalancedInput`, `verifyTransaction` | `posts balanced journal entries and preserves fee snapshots` | Same runs | Green incl. fee-snapshot asserts | PASS | None beyond T-FIN-01 unit duality |
| INV-03 | Settlements reconcile to ledger (`reconciliation/check` clean) | `finance.service.ts` verify→settlement; check endpoint | `holds every invariant…`, finance journey §5 | Same runs | Green | PASS | None |
| INV-04 | COD→hand-in→verify→settle→payout chain follows business rules (COD 3000 path, locks, state machine) | `finance.service.ts`, `riders` complete/hand-in | `finance.e2e` 9-step journey | Ran `finance.e2e` | 9/9 green (excessive-payout correctly 400) | PASS | Auto-settle/bank/invoice still missing features (not defects) |
| INV-05 | Duplicate requests cannot duplicate effects (same key replays; same key+diff payload → 409) | `LedgerService.post` resolve/claim/complete; `IdempotencyService` `(key,scope) UQ` | `replays duplicate payout requests…`, `posts adjustments idempotently…`, parcels 409 test | Same runs + parcels suite | Green; 409s observed as asserted negatives | PASS | `assign-rider`/dispatch/receive lack keys (T-API-01/04, already tracked) |
| INV-06 | Concurrent same-settlement requests serialize (double-verify → single settlement; one-of-two payouts wins) | `pessimistic_write` locks + UQs | `serializes double verification…`, `lets only one of two concurrent payouts succeed` | Same runs | Green | PASS | Multi-instance Redis drift (T-SEC rate-limit note) out of scope here |
| INV-07 | Failed transactions leave no partial records; corrections are compensating postings (never delete) | immutable `POSTED`, `reversalOfId`, `RESTRICT` FK | `releases funds through reversal postings…`, `…reverses settlements` | Same runs | Green | PASS | Crash-mid-tx untested (same as INV-01) |
| INV-08 | Consistent currency precision/units (BDT minor in ledger; `toMinor/toMajor HALF_UP`) | `money.ts`, `FinancialEntry.amount_minor CHECK>0` | pricing calc paths; ledger amounts asserted in minor | Suites green; amounts (e.g. ৳38710/৳38910, ৳46190) formatted correctly | PASS w/ residual risk | Dual wallet-decimal vs ledger-minor drift → T-FIN-01 still required |
| INV-09 | Reversals/cancellations/adjustments preserve auditability | reversal/adjustment postings; `cancelSettlementBatch` orphan noted | `posts adjustments idempotently and reverses settlements` | Same runs | Green | PASS w/ note | Orphan `cancelSettlementBatch` (no route) remains a suspected gap, NOT a failure (T-API-03) |
| INV-10 | Unauthorized users cannot access/mutate finance (anon 401; cross-role/merchant/hub 403) | `finance.controller.ts` roles; `HubAuthorizationService` | `rejects anonymous and cross-role…`, `isolates merchants…`, `scopes hub managers…` | Same runs | Green (403 `cash belongs to another hub`, cross-merchant denial observed as asserted) | PASS | Self-register ADMIN + missing auth rate-limit are Phase 1 items (T-SEC-01/02), not Phase 0 failures |
| INV-11 | Constraints + tx boundaries support the invariants (UQs, locks, outbox `SKIP LOCKED`) | entities + migrations 0002/0004 + publisher | concurrency tests above | Same runs | Green | PASS | `EXPLAIN`/index proof still open (T-QRY-06) |
| INV-12 | Zero-amount verify rule (`actualAmount @IsPositive` → 422 on 0) | `finance.dto.ts VerifyCashLedgerDto` | none (TC-FIN-007 missing) | Code read only; no test executed | Not exercised | NOT_TESTED | Blocked on business decision (allow recount-zero vs require positive) |
| INV-13 | Parcel/delivery state changes affecting COD accounting (complete→CashLedger; fail→no ledger) | `riders` complete/fail; `delivery.e2e-spec` | delivery 19 + hubs 9 + parcels 29 | Ran all three suites | 57/57 green (idempotency-409, sealed-bag-400, double-dispatch-409, partial-receive-409 observed as asserted) | PASS | Pickup-request assignment still missing feature (not defect) |

## C. Test execution results

All suites ran with shell `DATABASE_URL` overridden to `dhruto_phase0` (dev `dhruto` untouched; see A). `ERROR` log lines in output are tests asserting negative paths (403/400/409/422/404), not failures.

| Suite (exact path) | Command (from repo root) | Discovered | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|---|---|
| `apps/api/test/finance-ledger.e2e-spec.ts` | `pnpm --filter @dhruto/api exec vitest run test/finance-ledger.e2e-spec.ts` | 13 | 13 | 0 | 0 | 14.58s; covers TC-FIN-002–006,008 |
| `apps/api/test/finance.e2e-spec.ts` | `pnpm --filter @dhruto/api exec vitest run test/finance.e2e-spec.ts` | 9 | 9 | 0 | 0 | 7.98s; covers TC-FIN-001 (COD ৳3000 journey) |
| `apps/api/test/parcels.e2e-spec.ts` | `vitest run test/parcels.e2e-spec.ts` (same pattern, joint run) | 29 | 29 | 0 | 0 | Joint 23.49s for 3 files |
| `apps/api/test/delivery.e2e-spec.ts` | joint run | 19 | 19 | 0 | 0 | OTP/COD/concurrency/cross-hub cases green |
| `apps/api/test/hubs.e2e-spec.ts` | joint run | 9 | 9 | 0 | 0 | Bag/manifest/dispatch/receive green |
| Unit: `parcels.service` (8) + `parcel-lifecycle` (20) + `pricing.service` (17) + `idempotency.service` (9) | `vitest run src/parcels/parcels.service.spec.ts src/parcels/lifecycle/parcel-lifecycle.service.spec.ts src/pricing/pricing.service.spec.ts src/common/idempotency/idempotency.service.spec.ts` | 54 | 54 | 0 | 0 | 8.00s |
| **Totals** | | **133** | **133** | **0** | **0** | |

**C.0 Harness incident (disclosed, not an app result):** the first `finance-ledger` attempt ran with workdir `apps/api` so `apps\api\.env` did not resolve → connection string malformed → `TypeError: Invalid URL`, suite failed at `beforeAll`, 13 skipped, **zero database contact** (pool never connected). Reran correctly from repo root → 13/13. No data impact; recorded so the skipped run is never mistaken for a baseline.

**Limitations:** Redis-dependent behavior ran on fallbacks (memory cache, inline queues); queue-transport specifics (BullMQ→Upstash vs inline) were not asserted by these suites. `parcels-cursor`, `auth-and-rider`, `riders`, `analytics`, `intelligence*`, `notifications-webhooks`, `observability`, `scale-concurrency` e2e and remaining unit specs were NOT run (outside Phase 0 scope). Web (Playwright) suites were NOT run (need running API+web; out of scope).

## D. Defect register

- **Confirmed defects: NONE.** All 133 executed tests passed; every asserted negative path behaved as specified.
- **Harness incident:** C.0 above (operator workdir error; no app/test/code impact).
- **Suspected issues / known gaps (preserved from audit, NOT Phase 0 failures):** T-SEC-01 (self-register any role), T-SEC-02 (no auth rate-limit), T-AUTH-01 (no refresh rotation; logout no-op), T-FIN-01 (decimal/minor duality), T-API-01 (raw-body assign/bag-add), T-API-03 (`cancelSettlementBatch` orphan), T-DB zero-verify rule (INV-12 NOT_TESTED), T-QRY-06 (`EXPLAIN` proof open). Each retains its existing task ID and priority; none blocks Phase 0 exit.

## E. Baseline conclusion

- **Demonstrated:** on a disposable migrated+seeded database, the finance ledger is double-entry-balanced, atomic, idempotent, concurrency-safe (pessimistic locks + UQs), reversal-auditable, and authorization-scoped; the COD→hand-in→verify→settle→payout journey completes end-to-end; parcel/delivery/hub lifecycles feeding COD accounting behave per spec incl. all asserted rejections. 133/133 tests green.
- **Not demonstrated:** crash-mid-transaction recovery, multi-instance/Redis-backed rate-limit and queue behavior, zero-verify business rule, remaining e2e/unit suites, frontend journeys, load targets (`250RPS p95<300ms`), production parity.
- **Phase gate:** Phase 0 exit criteria (isolated disposable DB; relevant suites run where safe; results+limitations documented; invariants have explicit PASS/NOT_TESTED; defects vs suspicions separated; no source changes; no prod/external effects) are **MET**. Safe to proceed to **Phase 1 (T-SEC-01–04 + T-SEC-05)** when the owner explicitly approves. Do NOT start Phase 1 automatically.
