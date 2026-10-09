# Phase 1 — Security Remediation & Regression Verification

> Scope: T-SEC-01/02/03/04/05 only. No nav, pagination, features, rotation, history rewrite, or dependency changes. All tests ran against the disposable `dhruto_phase0` database (shell `DATABASE_URL` override; dev `dhruto` untouched). No secret values printed. No Phase 2 started.

## 1. T-SEC-01 — Restrict public registration (P0) — IMPLEMENTED + VERIFIED
- **Finding:** `RegisterDto.role @IsEnum(UserRole)` + `auth.service.ts:205 role = dto.role || MERCHANT` let anyone self-register ADMIN/HUB_MANAGER/RIDER. Revalidated in source before editing.
- **Root cause:** role taken directly from the public request body with no allowlist.
- **Files changed:** `apps/api/src/auth/services/auth.service.ts` (non-MERCHANT `role` → 403 `ForbiddenException`; role forced MERCHANT), `apps/api/src/auth/auth.controller.ts` (Swagger summary/description), `apps/api/test/auth-and-rider.e2e-spec.ts` (reworked §1 to merchant contract; rider flow now uses seeded `rider@dhruto.com`; added 403×ADMIN/HUB_MANAGER/RIDER/CUSTOMER + 422 invalid-role cases).
- **Before → after:** `POST /auth/register {role:ADMIN}` 201 ADMIN → 403; `{role:RIDER}` 201 → 403; missing role → MERCHANT (unchanged); invalid role → 422 (unchanged).
- **Tests:** reworked `auth-and-rider` (14 tests incl. new 403/422 cases) green. Existing accounts unaffected (no data migration; seeded riders/admins still login).
- **Note:** the `RIDER` branch in `register()` is now unreachable via public API; kept for future server-side provisioning (no invite system invented).

## 2. T-SEC-02 — Authentication rate limiting (P0) — IMPLEMENTED + VERIFIED
- **Finding:** no `@RateLimit` on `POST /auth/*`. Revalidated; guard existed but unused on auth.
- **Files changed:** `auth.controller.ts` (`register 10/60 auth-register`, `login 60/60 auth-login`, `refresh 60/60 auth-refresh`; login/refresh at 60 — not lower — because carrier-grade NAT shares IPs and bcrypt makes 1 guess/sec uneconomical; no per-account lockout by design, documented inline), `common/cache/cache.service.ts` (added atomic `incr` with Redis `INCR+EXPIRE`, `null` when Redis down), `common/rate-limit/rate-limit.guard.ts` (shared counter authoritative when Redis up → multi-instance correct; per-instance memory window when down → protection never silently disabled; same 429 shape + `Retry-After`, no account state).
- **Tests:** NEW `rate-limit.guard.spec.ts` (7: below/above+429 shape/independence/no-metadata passthrough/shared-counter/storage-failure-fallback/concurrent 10→3 ok+7 throttled) + NEW `auth-rate-limit.e2e-spec.ts` (3: register below-limit, register 11th → 429 + `Retry-After` + `RATE_LIMIT_EXCEEDED` + independent client unaffected, 65-login burst → 429s + 401s with no lockout). All green.
- **Budgets checked:** heaviest existing suite (`finance-ledger`, ~18 same-IP logins/file) stays under 60/60; register usage ≤6/file under 10/60.

## 3. T-SEC-03 — Secret exposure & rotation plan (P0) — REVALIDATED, PARTLY SUPERSEDED
- **Revalidation corrected the finding:** `git ls-files` shows only `.env.example` + `apps/web-merchant/.env.example` are tracked; `.gitignore` covers `.env`, `.env.*`, `env.*` (examples explicitly un-ignored). The on-disk `.env`, `.env.prod`, `env.prod`, `apps/api/.env`, `web-merchant/.env.local` are **untracked local files** — no real credentials are in version control. Both examples contain only placeholders (localhost URLs, `dhruto_dev_*_change_in_production` JWT markers, empty provider keys).
- **Actions taken:** none needed in git (nothing to remove); no history rewrite (not required — secrets were never committed); no rotation performed (explicit approval required, and no evidence of committed live secrets).
- **Safe-startup check:** covered by T-SEC-05 fail-closed tests (production boot without strong secrets throws).
- **Rotation readiness (if ever needed):** rotate `JWT_*` (invalidates all sessions), `DB_*`/`DATABASE_URL`, `UPSTASH_*`, `SMS/EMAIL_PROVIDER_*`, `INTELLIGENCE_PHONE_PEPPER` (re-peppering changes phone hashes — needs migration plan); then audit `git log -p -- .env*` before deciding on history cleanup. **Owner approval required before any rotation or history rewrite.**

## 4. T-SEC-04 — Global guards (P0) — IMPLEMENTED + VERIFIED
- **Finding:** `app.module.ts` had no `APP_GUARD`; protection depended on per-controller `@UseGuards`. Revalidated (13 class-level declarations, `me` method-level, health/tracking open by omission).
- **Files changed:** `app.module.ts` (`APP_GUARD JwtAuthGuard + RolesGuard`, resolvable via `@Global AuthModule`; rate limiting stays opt-in to avoid double-counting), 11 controllers (removed redundant JWT/Roles from `@UseGuards`, kept `RateLimitGuard`), `merchants.controller.ts` (decorator + imports removed), `auth.controller.ts` (`me` decorator removed), `health.controller.ts` (class-level `@Public()` — the one route relying on omission).
- **Public inventory preserved:** `POST /auth/register|login|refresh|logout`, `GET /tracking/:code`, `GET /health|/system*` (all `@Public`, verified by tests); everything else 401-anon.
- **Tests:** NEW `auth-guards.e2e-spec.ts` (7: anon 401×6 surfaces; public reachability incl. `/health` 200 + tracking 404-not-401 + login 401-not-403; 403 insufficient-role ×3; cross-merchant 403/404; cross-hub 403 + admin 200; rider isolation; admin surfaces). Green. No guard was weakened (controllers keep `@Roles`; hub resource checks untouched).

## 5. T-SEC-05 — Fail-closed JWT (P1) — IMPLEMENTED + VERIFIED
- **Finding:** `auth.config.ts` + `CustomJwtService` fell back to publicly-known dev secrets unconditionally. Revalidated.
- **Files changed:** `config/auth.config.ts` (extracted testable `buildAuthConfig(env)`; `NODE_ENV=production` with missing/empty/<32-char secrets → boot-time `throw`; dev/test keep explicit defaults). Service-level fallbacks retained for non-prod only — production can no longer reach them.
- **Tests:** NEW `auth.config.spec.ts` (6: prod-missing/empty/short throw; prod-valid resolves; dev defaults; expiry overrides) + NEW `custom-jwt.service.spec.ts` (7: valid verify; wrong-secret signature reject; expired reject; `alg:none` reject; malformed ×3; refresh-as-access type reject). Green. No token/secret values logged (only error classes asserted).

## 6. Regression & verification
| Check | Result |
|---|---|
| Typecheck `tsc --noEmit` (api) | clean |
| ESLint (touched areas) | clean |
| `nest build` (api) | success |
| NEW unit (20: config 6 + jwt 7 + guard 7) | 20/20 |
| NEW e2e (rate-limit 3 + guards 7) + reworked auth-and-rider (14) | 24/24 |
| Full API suite `vitest run` (34 files: 16 e2e + 18 unit) | **316/317 pass** (see §7 for the 1 failure) |
| Phase 0 finance invariants re-run in full suite (finance-ledger 13 + finance 9) | still green — invariants preserved |
| Git diff review | 20 tracked files, all in scope (`apps/api/src` ×15 controllers/config/guards/cache/auth + `auth-and-rider` rework) + 5 new test files; no unrelated changes |

## 7. Defect register
- **Confirmed PRE-EXISTING defect (not a regression, out of Phase 1 scope — NOT fixed): F-OBS-01 `parcel.created` fan-out silently dead.** `parcels.service.ts:376-392` publishes `ParcelCreatedEvent` whose payload lacks `merchantId` and `parcelId`, but `outbox-relay.service.ts:570` (`fanOutWebhook`) and `resolveRecipient` require `payload.merchantId`. Result: all three PARCEL_CREATED targets (webhook, merchant in-app, merchant email) silently skip while the outbox row is marked PUBLISHED (no retry will recover). Evidence: 123 `parcel.created.v1` PUBLISHED rows vs 0 `webhook_deliveries` for it and 0 `parcel_created` notifications in `dhruto_phase0`; sibling events (assigned/hand-in/failed) fan out normally. Proven pre-existing by stashing Phase 1 `src` changes and rerunning `notifications-webhooks.e2e-spec.ts` on baseline → identical 8/9 with test 7 (`Timed out waiting for parcel.created webhook delivery`) failing. The dead fallback branch (`parcels.service.ts:395-406`, which DOES include both fields) shows the relay contract was known. **Recommended fix (Phase 2/3 candidate, needs owner approval):** include `parcelId` + `merchantId` in the primary `ParcelCreatedEvent` payload (and audit all other `publish()` call sites for the same omission). The 1 full-suite failure is this test; everything else is green.
- **Suspected, not failures:** T-SEC-03 rotation/history (no evidence of committed secrets — approval-gated anyway); refresh rotation still absent (explicitly out of scope); `RateLimitGuard` window-reset path covered by code simplicity, not a dedicated clock test.

## 8. Config / deployment notes
- No new env keys. Effective limits: register 10/min/IP, login 60/min/IP, refresh 60/min/IP (429 + `RATE_LIMIT_EXCEEDED` + `Retry-After`).
- Production now requires `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (≥32 chars) or boot fails — set via secret manager (never commit). No credential rotation performed in this phase.
- Multi-instance note: limiter is exact when shared Redis is reachable, per-instance otherwise; no lockout state exists anywhere.

## 9. Remaining risks & approvals needed
1. F-OBS-01 fix approval (payload contract change + regression of webhooks spec) — proposed for Phase 2.
2. Rotation/history approval (only if owner wants it despite no evidence of committed secrets).
3. `notifications-webhooks` test 7 remains red until F-OBS-01 is fixed (tracked here, not hidden).
4. Window-expiry and Redis-up multi-instance paths verified by code + unit stubs, not live multi-instance e2e (no harness for it).
5. Web (Playwright) suites not run (unchanged frontend; out of scope).

**Phase 1 tasks T-SEC-01/02/04/05 verified complete; T-SEC-03 verified (no tracked secrets; rotation approval-gated). Awaiting explicit approval before Phase 2.**
