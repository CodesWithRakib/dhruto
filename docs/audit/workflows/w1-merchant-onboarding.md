# W1 — Merchant Onboarding + Login

1. **User/goal:** Visitor → merchant account → dashboard.
2. **Preconditions:** none (public). Backend `POST /auth/register` `@Public`.
3. **Entry:** `/:locale/register` (`features/auth/components/register-form.tsx`) → `/:locale/login` (`login-form.tsx`) → `/:locale/merchant/dashboard` (`features/dashboard/merchant-dashboard.tsx`).
4. **Journey:** (a) fill name/email/phone/password/business/pickup → `useRegisterMutation POST /api/v1/auth/register {role:MERCHANT}` (frontend-fixed) → `setCredentials` (localStorage 3 keys) → `homeForRole(MERCHANT)=/merchant/dashboard`. (b) Login: `emailOrPhone+password → POST /auth/login` → same persist+redirect. (c) Session: `base-api` Bearer + single-flight `POST /auth/refresh`; `GET /auth/me` for profile.
5. **Screens/actions:** register/login forms (show/hide pw, validation, `signInFailed/registrationFailed`); `rememberMe` UI-only.
6. **API/rules:** `auth.controller.ts:23,45,65,85,105`; `RegisterDto:auth.dto.ts:16` (phone regex, pw≥6); conflict→409; login `status!=ACTIVE→401`; Rider branch creates `Rider` row; Merchant branch creates `Merchant` row.
7. **Entities:** `User` (+`Merchant` if MERCHANT, `Rider` if RIDER). No `CUSTOMER` row.
8. **Validation/failures:** 409 conflict, 401 bad creds/inactive, 422 validation (`DhrutoValidationPipe`); frontend `AlertCard` + toast.
9. **Success:** `isAuthenticated`, lands on role home; `lastListUrl` cleared on logout.
10. **Downstream:** `Merchant/Wallet` rows (seed ensures wallet); audit listener logs only (`audit-event.listener.ts`).
11. **Edge:** duplicate email/phone; inactive/suspended; unknown role → `asAppRole→MERCHANT` (P2 gap); `ADMIN` self-register (P0 gap).
12. **Missing:** merchant profile edit UI (backend `PATCH /merchants/me` exists, no page); password recovery (no forgot/reset routes found → Missing); ADMIN/HUB/RIDER signup; email/phone verification.
13. **Tests:** API `test/auth-and-rider.e2e-spec.ts` (12 `it`: register/login/me/401/refresh); web `tests/e2e/merchant-login.spec.ts, auth-session.spec.ts, rider-login.spec.ts`; unit `auth-token.test.ts, reauth.test.ts, roles-permissions.test.ts`. Missing: brute-force/rate-limit, inactive-login, duplicate-race, refresh-reuse cases (see `test-cases/`).
