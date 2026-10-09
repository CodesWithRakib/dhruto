# 15 — Prioritized Master TODO

> No dates/hours. Complexity S/M/L/XL. Each task: ID, title, category, evidence, impact, priority, deps, approach, files, acceptance, tests, docs, complexity, checklist. Categories: (1) correctness/security, (2) broken/incomplete, (3) integration gaps, (4) nav/routes, (5) query, (6) missing capabilities, (7) DB/API arch, (8) testing, (9) perf/ops, (10) UX/a11y/i18n, (11) long-term.

## (1) Critical correctness & security
| ID | Title | Evidence | Impact | Pri | Deps | Approach / files | Acceptance | Tests | Docs | Cx |
|---|---|---|---|---|---|---|---|---|---|---|
| T-SEC-01 | Restrict register roles (allowlist MERCHANT; invite/approve others) | `auth.dto.ts:44-47`, `auth.service.ts:205` | stops ADMIN self-register | P0 | — | DTO `@IsIn([MERCHANT])` + admin-invite flow; `auth.*`, `RegisterDto` | `role:ADMIN` → 403; TC-AUTH-002 | NEW `authz.e2e` | `02` | S |
| T-SEC-02 | Rate-limit `POST /auth/*` | `auth.controller.ts` (no `@RateLimit`) | stops brute-force | P0 | — | `@RateLimit` login/register/refresh (+`Retry-After`); guard already exists | 429 + header; TC-AUTH-005 | NEW | `13` | S |
| T-SEC-03 | Rotate leaked secrets + git-ignore `.env*` + secret-scan CI | `/.env`, `/apps/api/.env`, `/apps/web-merchant/.env.local` committed | stops leak | P0 | — | rotate JWT/DB/provider keys; `.gitignore`; secret job in `ci.yml` | no `.env` tracked; scan passes | CI check | `13` | S |
| T-SEC-04 | Global default-deny guards (`APP_GUARD`) | `app.module.ts:60-81` | no open-by-omission | P0 | — | `APP_GUARD JwtAuthGuard, RolesGuard`; keep `@Public`; arch test | new controller w/o guard → 401 | NEW arch test | `02` | S |
| T-SEC-05 | Fail-closed JWT config (no dev fallback in prod) | `auth.config.ts:11-14`, `custom-jwt.service.ts` | no known-secret boot | P1 | T-SEC-03 | assert secrets set when `NODE_ENV=production`, else crash | prod w/o env → refuses boot | unit | `13` | S |
| T-FIN-00 | Execute ledger proof suite (no code change) | `finance-ledger.e2e` (13), `finance.e2e` (9) not run here | confirms money correctness | P0 | staging DB | run `vitest run finance-ledger finance` on CI-like env; record in `18` | all green + balanced asserts | existing | `18` | M |
| T-FIN-01 | Unify money reads (minor canonical) | `06§3` decimal vs bigint | stops rounding drift | P1 | T-FIN-00 | display via `toMajor`, store minor; compat getters; `money.ts`, wallet/tx mappers | no `৳x.999`; e2e green | ledger e2e + unit | `06` | M |

## (2) Broken / incomplete existing
| ID | Title | Evidence | Pri | Approach | Acceptance |
|---|---|---|---|---|---|
| T-AUTH-01 | Refresh rotation + logout revocation | `auth.service.ts:350`, `auth.controller.ts:79` | P1 | version/jti blacklist (Redis) + rotation; TC-AUTH-004 | reuse → 401; logout → refresh dead |
| T-API-01 | DTO-validate assign-rider + bag-add | `parcels.controller.ts:255`, `hubs.controller.ts:278` | P1 | блока `AssignRiderDto{riderId UUID}`, use `AddParcelToBagDto`; 422 shape | invalid UUID → 422 |
| T-API-02 | Fix `codAmount` optional + webhook `events` enum + SMS phone + zero-verify rule | `pricing.controller.ts:63`, `webhook.dto.ts:25`, `notification.dto.ts:98`, `finance.dto.ts` verify | P2 | `@IsOptional`, `IsEnum(WebhookEvent, each)`, BD regex, business decision on 0 | 422 parity + rule doc |
| T-UI-01 | `*/settings` dead links → create profile pages or remove | `dashboard-shell.tsx:241`, zero `settings/page.tsx` | P1 | merchant profile (`PATCH /merchants/me` exists) + hub/rider (verify PATCH) | no 404 links |
| T-UI-02 | Remove-or-build bulk (`?mode=bulk`) | `navigation.ts` vs `booking-form` | P1 | decide T-FEAT-01 or delete nav | nav == capability |
| T-UI-03 | Bind static KPIs / replace placeholders | `merchant/intelligence` strip, `admin-console`, `analytics.controller.ts:354` | P1 | bind health/metrics/overview or remove | no hardcoded metrics |
| T-UI-04 | Invalid analytics `:section` → 404; guard `/:locale/analytics` | `[section]/page.tsx`, `[locale]/analytics/page.tsx` | P1 | `notFound()` + redirect dup | invalid → 404; dup → redirect |
| T-API-03 | Route-or-remove `cancelSettlementBatch` | `finance.service.ts:1270` no route | P1 | add `POST batches/:id/cancel` or delete + test | no orphans |
| T-API-04 | Verify `analytics-exports` queue binding + `system/*` prefix + rider scoping (`void riderId`) | `queues.module.ts`, `main.ts:35`, `analytics.controller.ts:532` | P2 | register queue / fix exclude / scope rider | processors bind; rider sees own |

## (3) Integration gaps
T-INT-01 Wire `useGetParcelHistoryQuery` or delete (P3). T-INT-02 Wire `useUpdateMerchantProfile` via settings (P2, with T-UI-01). T-INT-03 Wire `useTestSms` behind ADMIN dev-tools or delete (P3). T-INT-04 Consume `observability.api` in admin health card or delete (P2). T-INT-05 Document `getDefaultMerchant` non-use + lint-ban (P2).

## (4) Route & navigation restructuring (per `09`)
T-NAV-01 Merchant modules + landing (`parcels/` cards) (P1, M). T-NAV-02 Admin fill orphans + grouped analytics nav (P1, S). T-NAV-03 Hub/rider orphans → nav (P1, S). T-NAV-04 Remove `/:locale/analytics` dup (P1, S). T-NAV-05 Breadcrumbs + `lastListUrl` extension (P2, S). T-NAV-06 Label renames (`reports→intelligence`, `settings→webhooks`) (P2, S).

## (5) Shared query (per `10`/`11`)
T-QRY-01 Contracts `page/cursor/sort/search/range` + DTO `implements` (P1, M). T-QRY-02 Parcels `mode:offset|cursor` + cursor validator (P1, M). T-QRY-03 Deprecate analytics legacy `period` (P2, S). T-QRY-04 Unfix rider history pagination (P2, S). T-QRY-05 `useQueryState` validators + `infinite-list` + toolbar/pagination in `@dhruto/ui` (P2, M). T-QRY-06 `EXPLAIN` + indexes (parcel cursor + analytics ranges) (P1, M).

## (6) Missing capabilities
T-FEAT-01 Bulk import (CSV/XLSX → job → report) OR scope-cut (P1, XL; needs product decision). T-FEAT-02 Parcel edit/cancel policy + UI (P1, L). T-FEAT-03 Password recovery (P1, M). T-FEAT-04 Pickup requests (discover req.; P2, L). T-FEAT-05 Returns/RTO list + rules (P2, L). T-FEAT-06 Invoice PDF + auto-settle schedule + bank refs (P2, L). T-FEAT-07 Push + template editor (P3, M).

## (7) DB/API arch
T-DB-01 No-`remove()` audit on ledger/parcel (P0, S). T-DB-02 Retention policy (no soft-delete → hard-delete + audit) (P2, S). T-DB-03 FK `AddressAlias.placeId` (P3, S). T-API-05 Swagger deprecations + examples (P3, S).

## (8) Testing & gates (per `12`)
T-TST-01 Run full suites + record in `18` (P0, M). T-TST-02 NEW: authz matrix, fuzz, concurrency, PII, provider/Redis-down (P1, M). T-TST-03 Analytics section matrix + invalid-404 (P2, S). T-TST-04 Axe + key-diff + bundle budget in CI (P2, S). T-TST-05 Staging load `250RPS p95<300ms` (P2, M).

## (9) Perf/ops
T-OPS-01 Minimal `Dockerfile` api/web + compose services + migration rules (P2, M). T-OPS-02 Gate `metrics/prometheus` + fix `getHealth` (P1, S). T-OPS-03 Redis-down drill + rate-limit assertion (P2, S). T-OPS-04 Pool/timeout/bulk exemptions (P2, S). T-OPS-05 Startup env assert (`SITE_URL`, pepper, providers warn) (P2, S).

## (10) UX/a11y/i18n
T-UX-01 Confirm copy standard for money/state actions (P1, S). T-UX-02 Register friction (optional business/pickup) (P3, S). T-UX-03 Focus-trap/skip-link/labels/charts-alt/touch-targets (P2, M). T-UX-04 bn key-diff + tz/currency tests (P2, S).

## (11) Long-term
T-LT-01 Model retraining pipeline (Blocked). T-LT-02 Route optimization. T-LT-03 Scheduled reports. T-LT-04 `CUSTOMER` role scope-or-remove.

## Phase 6 verification (approved implementation, `docs/audit-validation/phase-6-bulk-and-attempt-cap.md`)
- Q-BULK backend slice VERIFIED COMPLETE (template/validate/import + batch-key idempotency + 5 tests). File-upload UI + >500 async jobs remain proposed.
- Q-ATTEMPT-CAP VERIFIED COMPLETE (cap 5 → 409 + RTO path + test; completion uncapped; riders toMinor unified to exact version).
- Full API suite 350/350; contracts 12/12; web unit 138/138; typecheck/lint/build clean.

## Phase 5 verification (approved implementation, `docs/audit-validation/phase-5-money-and-cleanup.md`)
- T-FIN-01 VERIFIED COMPLETE (integer-math audit + exact HALF_UP `toMinor` fix for x.xx5 inputs + 6 contract tests).
- T-API-03 VERIFIED COMPLETE (cancel batch routed with member release — stranding bug fixed + test).
- T-INT-01 VERIFIED COMPLETE (dead `getDefaultMerchant` removed, zero callers).
- Full API suite 344/344; web unit 138/138; typecheck/lint/build clean.

## Phase 4 verification (approved implementation, `docs/audit-validation/phase-4-rto-and-scoping.md`)
- T-RTO-01 COMPLETE (advance/complete endpoints + first ParcelReturnedEvent + hub-scoped RTO commands + tests).
- T-SCOPE-01 VERIFIED COMPLETE (alert list/ack hub scoping + tests; intelligence endpoint accepted-risk documented).
- Full API suite 337/337 on fresh disposable DB; typecheck/lint/build clean.

## Phase 3 verification (approved implementation, `docs/audit-validation/phase-3-implementation.md`)
- T-OBS-01 VERIFIED COMPLETE (fan-out repair; webhooks spec 9/9).
- T-SEED-01 VERIFIED COMPLETE (non-prod seed gate + unit tests).
- T-VAL-01, T-EXC-01, T-IDEM-01 VERIFIED COMPLETE (DTOs, re-resolve 409, key-length 422 + tests).
- T-CANCEL-01, T-RTO-01 VERIFIED COMPLETE (matrix-policy endpoints + replay semantics + tests).
- T-LIT-01 VERIFIED COMPLETE (live activity/bottlenecks/health-bound hero).
- T-BULK-01 PARTIAL (dead nav removed; full build awaits Q-BULK decision).
- Full API suite 332/332; contracts 12/12; web unit 138/138; typecheck/lint/build clean.

## Phase 1 verification (2026-10-09, `docs/audit-validation/phase-1-security-remediation.md`)
- T-SEC-01 VERIFIED COMPLETE (merchant-only public registration + 403/422 tests).
- T-SEC-02 VERIFIED COMPLETE (auth rate limits 10/60/60 + atomic shared/memory limiter + unit/e2e tests).
- T-SEC-03 VERIFIED (no secrets in git — tracked files are placeholders only; rotation/history-rewrite APPROVAL-GATED, not performed).
- T-SEC-04 VERIFIED COMPLETE (global JwtAuthGuard + RolesGuard; health `@Public`; 7-test guard matrix green).
- T-SEC-05 VERIFIED COMPLETE (fail-closed prod JWT config + 13 unit tests).
- Full API suite: 316/317 (sole failure = pre-existing F-OBS-01 `parcel.created` fan-out defect, proven on baseline, fix deferred to Phase 2 with owner approval).
