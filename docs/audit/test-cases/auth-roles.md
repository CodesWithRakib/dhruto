# Test Cases — Auth & Roles (F01) — selected (template: `_template.md`)

| ID | Route/feature | Level | Preconditions/actor | Steps → expected | Neg/edge | Automation | Status |
|---|---|---|---|---|---|---|---|
| TC-AUTH-001 | `POST /auth/register` MERCHANT | e2e | none → merchant | valid body → 201 `{user,tokens}` + `Merchant` row | duplicate email/phone → 409; bad phone → 422 | `auth-and-rider.e2e` | existing-unverified |
| TC-AUTH-002 | `POST /auth/register role=ADMIN` | security | anon | send `role:ADMIN` → today 201 (GAP) → after fix 403/allowlists | `HUB_MANAGER/RIDER/CUSTOMER` same | NEW `authz.e2e` | missing (P0 task) |
| TC-AUTH-003 | `POST /auth/login` + inactive | e2e | seeded merchant/rider | valid → 200 pair; wrong pw → 401; `SUSPENDED` → 401 `Account is…` | `emailOrPhone` phone variant; unknown → 401 (no enum) | `auth-and-rider.e2e` + NEW inactive | existing-unverified + missing variant |
| TC-AUTH-004 | `POST /auth/refresh` reuse | e2e/security | logged in | refresh → new pair; reuse old → after rotation 401 (NEW behavior) | expired/tampered → 401 | NEW | missing (needs rotation impl) |
| TC-AUTH-005 | `POST /auth/*` rate-limit | security | anon | 30 rapid logins → 429 + `Retry-After` (after impl) | distributed (2 instances) | NEW | missing (P0 task) |
| TC-AUTH-006 | `GET /auth/me` | integration | Bearer | valid → profile + ids; no header → 401; refresh-as-access → 401 (`type` check) | quote-wrapped token (tolerated) | `auth-and-rider.e2e` | existing-unverified |
| TC-AUTH-007 | Frontend session | frontend/e2e | merchant | login → `homeForRole` → reload persists (localStorage) → logout clears 3 keys + `lastParcelListUrl` | expired access → single-flight refresh → retry once; refresh fail → `/login` | `reauth.test.ts`, `auth-session.spec.ts`, `merchant-login.spec.ts` | existing-unverified |
| TC-AUTH-008 | Role matrix (direct-route) | e2e | each role | merchant→`/admin/*` → bounce to `/merchant/dashboard`; hub→`/rider/*` bounce; CUSTOMER→any protected → `/track` | tampered `dhruto_user.role` → server still 403 (client default MERCHANT gap) | `auth-session.spec.ts` + NEW matrix | partial (extend) |
| TC-AUTH-009 | Hub scoping | e2e/security | HUB_MANAGER ± assignment | no assignment → 403 `HUB_FORBIDDEN`; wrong hub → 403; inactive hub → 403; missing perm → 403 `PERMISSION_DENIED`; ADMIN bypass | `uuid` vs `CODE` resolve; case-insensitive code | `hubs.e2e` (auth part) | existing-unverified |
| TC-AUTH-010 | Recovery (forgot/reset) | e2e | merchant | request → token → reset → login (after impl) | expired/reused token → 410/401; enumeration-safe response | NEW | missing (feature missing) |
