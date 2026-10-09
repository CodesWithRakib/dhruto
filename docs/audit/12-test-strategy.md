# 12 — Test Strategy (Index → `test-cases/`)

> Reflects business behavior, not render-only. Levels: unit / integration / frontend / e2e / security-resilience. Status: existing-but-unverified (no execution this pass) unless stated. Deterministic seeds (`dhruto123`, `DHR-2610-00101…`, `HUB-DHK-01`, `RDR-xxxxxx`); never prod/real-customer data. Commands: API `pnpm --filter @dhruto/api test` (vitest incl. e2e-spec), web `pnpm --filter @dhruto/web-merchant test` + `test:e2e` (playwright chromium + Pixel5); root `turbo test|test:e2e`; CI `quality` (all PRs) + `e2e` (main/dispatch, postgres:16+redis:7, `db:setup`, health gates).

## 1. Inventory (files)
- API e2e 14: auth-and-rider (12 `it`), parcels (29), parcels-cursor (1), hubs (9), riders (9), delivery (19), finance (9), finance-ledger (13), notifications-webhooks (9), intelligence (9), intelligence-v2 (10), analytics (11), observability (6), scale-concurrency (5).
- API unit 15: parcels.service (8), parcels-cursor (2), lifecycle (20), pricing (17), analytics-range (9), idempotency (9), templates (9), risk-rto (12), address-intel (8), address-load (1), normalization (8), phone-hash (4), providers (11), url-safety (7), webhook-security (9).
- Web e2e 24 (+helpers/fixtures): auth-session (2), merchant-login (3), rider-login (2), create-parcel (3), booking.smoke (1), parcel-list/details/next-step (2+2+2), public-tracking (3), public-and-routes (5), hub-inbound (4), hub-dispatch-receive (1), hub-bagging (2), bn-spots (3), rider-delivery (5), finance-merchant/hub/admin (2+2+2), mobile ×4 (4+3+2+2).
- Web unit 28: roles-permissions (8), auth-token (4), reauth (4), api-errors (4), + route/i18n/list/card/finance/dashboard/form/primitives (1–9 each, ~140 total).

## 2. Coverage plan by level (what to add — details in `test-cases/`)
- **Unit:** validation/transform, guards (`ADMIN` bypass + hub perms), lifecycle transitions, pagination/cursor parsing, money (`toMinor/toMajor`, balanced journals), address normalize + HMAC, risk scoring (+bias assert keep).
- **Integration:** controllers+services+transactions (double-verify serialize, payout state/idempotency/concurrency, reversal, batches), repo queries (`EXPLAIN` budgets), authN/Z matrix, validation/response contracts (envelope + 422 shape), provider adapters (SMS/email log-fallback), jobs/events (outbox `SKIP LOCKED`, BullMQ retries → DLQ).
- **Frontend:** render+nav, RHF validation, table sort/filter/pagination + URL sync, API success/fail (incl. 401 reauth single-flight), loading/empty/error, role visibility (incl. `*/settings` 404 today → page tomorrow), a11y-critical (focus, labels, keyboard).
- **E2E:** sign-in per role; W1–W11 happy paths; parcel lifecycle; assign→OTP→COD→hand-in→verify→settle→payout; returns/exceptions; search/filters/deep-links; mobile nav; bn/en switch; **unauthorized direct-route** (merchant→`/admin`, cross-merchant `:id`, cross-hub, rider cross-task).
- **Security/resilience:** cross-tenant (all resources), missing/insufficient perms (hub perms matrix), invalid payloads/query (fuzz enums/cursor), duplicate-Key + concurrent complete/verify/payout, `Retry-After` + brute-force (after rate-limit added), PII exposure (public tracking masked), provider-down (inline fallback), Redis-down (memory fallback + drift documented).

## 3. Test-case docs
| Doc | Covers |
|---|---|
| `test-cases/_template.md` | ID / feature+route / level / preconditions+data / actor+perms / steps / expected / negative-edge / automation / status |
| `test-cases/auth-roles.md` | F01: register/login/refresh/me, role matrix, hub scoping, recovery (NEW) |
| `test-cases/parcels.md` | F02/F04/F05: booking/pricing/label/list/track, idempotency, isolation, cursor |
| `test-cases/hub-rider.md` | F06–F10: scan/bag/manifest/exceptions/assign/OTP/COD/fail/duty |
| `test-cases/finance.md` | F11–F12: hand-in/verify/discrepancy/settle/batch/payout/adjust/reverse/reports/check |
| `test-cases/notifications-webhooks.md` | F14–F16: prefs, transports, HMAC/replay, DLQ/outbox replay |
| `test-cases/intelligence-analytics.md` | F17–F18: parse/confirm/risk/RTO/geo/import + ranges/alerts/exports |
| `test-cases/security-resilience.md` | Cross-tenant, perms, fuzz, concurrency, rate-limit, PII, provider/Redis-down |
| `test-cases/frontend-ux.md` | Forms/tables/states/visibility/a11y/i18n/mobile |

## 4. Gaps (missing/blocked)
Missing: bulk e2e (no feature), pickup/returns dedicated, settings pages (today assert 404), analytics section full-matrix, invalid-section 404, zero-verify rule, `cancelSettlementBatch`, scheduled reports, push. Blocked: real SMS/email (needs keys), prod-scale load (needs staging), secret-scan in CI (no job). All tracked as tasks in `15`.
