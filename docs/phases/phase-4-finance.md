# Phase 4 — Finance, Wallet, COD Reconciliation & Merchant Settlement

Implementation record. Principles live in `../09-FINANCIAL-DESIGN.md`;
state machine notes in `../08-STATE-MACHINE.md`.

## What was built

- **Double-entry journal**: `financial_transactions` + `financial_entries`
  (BIGINT minor units, `CHECK (amount_minor > 0)`, balance enforced in
  `LedgerService.post`, immutable, idempotent per scope).
- **Money library**: `apps/api/src/common/money/money.ts` (poisha integers,
  `CURRENCY_BDT` central constant).
- **Settlement**: per-parcel `settlements` rows (gross/fee/net snapshot +
  journal reference) created at hub verification; `settlement_batches` for
  admin grouping/reporting (batches never move money — funds release at
  verification by documented business rule).
- **Hand-in batches**: `cash_handins` + `cash_handin_items` created by rider
  submit with server-computed totals; hub verifies per ledger; batch status
  derived (SUBMITTED → VERIFIED / DISCREPANCY).
- **Discrepancies**: auto-created `cash_discrepancies` (SHORT/OVER with
  expected/actual/difference preserved; collected amount never overwritten);
  admin resolve with reason + optional recovery posting to the merchant.
- **Payouts**: `payoutCode` (`PAY-######`), per-merchant idempotency keys,
  `REQUESTED → APPROVED → PROCESSING → COMPLETED` with
  `REJECTED`/`FAILED`/`CANCELLED` releasing reservations via reversal
  postings; masked destinations in every response.
- **Adjustments/reversals**: reason-mandatory manual adjustments (idempotent)
  and mirror-entry reversals that mark originals `REVERSED` and unwind wallet
  effects atomically.
- **Security first**: the finance controller previously had no guards and a
  default-merchant fallback — now `JwtAuthGuard + RolesGuard +
  RateLimitGuard` everywhere, owner-scoped merchant endpoints, hub-scoped hub
  endpoints, admin-only finance console. No raw entities in responses.
- **Reconciliation check**: `GET /admin/finance/reconciliation/check`
  compares ledger-derived vs materialized wallets, rider cash positions,
  settlement math and per-transaction balance. Reports mismatches; repairs
  nothing. Adoption drift is absorbed once via `OPENING_BALANCE` postings
  (migration `1700000000005` + seeder), never silent edits.
- **Reports**: COD/settlement/payout/fee reports with filters, pagination and
  CSV export (server-generated, authorization-respecting).
- **Frontend**: merchant wallet/statement/settlements/payout-request with
  review step and per-action idempotency keys; hub cash desk
  (`/hub/cash`) with verify confirmation and discrepancy review; admin
  finance console (overview, payouts approve/reject/process with
  confirmations, settlements + batches, journal + reversals, adjustments,
  discrepancies, reports, reconciliation check); rider hand-in batch history;
  full English + Bangla (130 Finance keys, parity-tested); masked account
  display everywhere.

## Verification

- `apps/api/test/finance.e2e-spec.ts` (9, legacy journey on the secured API)
- `apps/api/test/finance-ledger.e2e-spec.ts` (13: auth, invariants,
  discrepancy, payout machine, idempotency, concurrency, adjustments,
  reversals, batches, reconciliation check, reports/CSV)
- Playwright in Brave: `finance-merchant` (2), `finance-hub` (2),
  `finance-admin` (2), `finance-mobile` (2), `finance-bn-spot` (1)

## Invariants (all tested)

1. No negative available balance. 2. Every posting balanced. 3. Postings
   immutable. 4. Every payout references a reservation/completion posting.
2. Every merchant credit references a settlement/adjustment source. 6. Every
   verification references its hand-in. 7. Every settlement references
   parcel + collection. 8. Fees snapshotted, never recomputed. 9. Wallet
   balances derivable from the journal.

## Phase 5 readiness

Financial side effects already emit webhooks (`CASH_VERIFIED`,
`PAYOUT_COMPLETED`) and in-app notifications (`CASH_COLLECTED`,
`PAYOUT_UPDATE`) through the existing infrastructure; queue workers, retry
and DLQ can attach to those events without touching ledger logic. No
notification subsystem was duplicated.
