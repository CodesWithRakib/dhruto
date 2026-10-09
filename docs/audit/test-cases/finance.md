# Test Cases — Finance (F11/F12) — selected

| ID | Steps → expected | Automation | Status |
|---|---|---|---|
| TC-FIN-001 Full journey: deliver COD3000 → hand-in → verify → settlement → payout request → approve → complete → wallet/ledger correct + `reconciliation/check` clean | `finance.e2e` (9) + web `finance-merchant/hub/admin` | existing-unverified |
| TC-FIN-002 Balanced journals: every `FinancialTransaction` `sum==0`; `RESTRICT` prevents orphan delete; reversal creates compensating entry (never delete) | `finance-ledger.e2e` (13) | existing-unverified |
| TC-FIN-003 Double-verify serialize: concurrent `POST verify` same ledger → single win, other 409; SHORT → `CashDiscrepancy` → resolve `{recovered, reason}` | `finance-ledger.e2e` | existing-unverified |
| TC-FIN-004 Payout state: PENDING→APPROVED→COMPLETED/FAILED/REJECTED; cancel only pending; same-Key replay safe; concurrent requests → single | `finance-ledger.e2e` | existing-unverified |
| TC-FIN-005 Adjustments `CREDIT\|DEBIT ≤100M + reason` (+Key) + `cancelSettlementBatch` route-or-remove (today orphan) | via ledger e2e + NEW | partial |
| TC-FIN-006 Reports: `GET reports/cod\|payouts\|fees ?format=csv` downloads; `reconciliation/check?merchantId` | `finance-ledger.e2e` (CSV) | existing-unverified |
| TC-FIN-007 Zero-verify: `actualAmount=0` → today 422 (confirm rule: allow recount-zero vs require positive) | NEW (needs business decision) | missing |
| TC-FIN-008 Frontend: wallet skeleton → statement/payouts/settlements tabs (`?tab&?type`) → request modal (amount≥100 + accountDetails) → cancel confirm; admin approve/process/reverse/adjust confirms | `finance.test.tsx`, `finance-i18n/routes`, web finance specs | existing-unverified |
