# 02 — User Roles & Permissions

> Evidence: `apps/api/src/database/entities/User.entity.ts:10-16`, `auth/*` (controller/service/DTO/jwt/guards/decorators), `common/permissions/hub-permissions.ts`, `hubs/hub-authorization.service.ts`, `web-merchant/config/{roles,navigation,routes}.ts`, `store/auth.slice.ts`, `lib/api/base-api.ts`, `proxy.ts`.

## 1. Roles (source of truth: `User.role`)
`UserRole = ADMIN | MERCHANT | RIDER | HUB_MANAGER | CUSTOMER` (`User.entity.ts:10-16`). `UserStatus = ACTIVE|INACTIVE|SUSPENDED`. `User{email UQ, phone UQ, passwordHash, role default MERCHANT}`.

| Role | How assigned | Side rows | Seed (`auth.service.ts:62-187`, pw `dhruto123`) |
|---|---|---|---|
| ADMIN | `POST /auth/register {role:ADMIN}` (unguarded!) or seed | none | `admin@dhruto.com` |
| MERCHANT | default (`dto.role\|\|MERCHANT`); frontend register hardcodes `MERCHANT` (`features/auth/api/auth.api.ts:13`) | `Merchant{user_id UQ}` | `merchant@dhruto.com` + `Rahim Enterprise` |
| RIDER | `register {role:RIDER, hubId?}` (auto-assign first hub if missing) or seed | `Rider{User,Hub,riderCode UQ}` | `rider@dhruto.com` + `RDR-xxxxxx` |
| HUB_MANAGER | `register {role:HUB_MANAGER}` or seed (NO assignment seeded) | needs `HubUserAssignment` row | `hubmanager@dhruto.com` (cannot operate until assigned → 403) |
| CUSTOMER | only `register {role:CUSTOMER}`; no seed, no dedicated endpoints | none | — (dead-end role) |

## 2. Auth flows
- **Register `POST /api/v1/auth/register` `@Public`** (`auth.controller.ts:23`, `RegisterDto:auth.dto.ts:16`): `name,email,phone(BANGLADESH_PHONE_REGEX),password≥6,role?,businessName?,pickupAddress?,hubId?`. Conflict (email OR phone) → 409. Creates Merchant/Rider side rows as above. Returns `{user{id,name,email,phone,role,merchantId,riderId,hubId}, tokens{access,refresh,expiresIn}}`.
- **Login `POST /auth/login` `@Public`** (`:45`, `LoginDto:65`): `emailOrPhone + password` (lookup email==id OR phone==id). `!user / bad pw → 401`; `status!=ACTIVE → 401 Account is {status}`. Resolves ids, returns same token pair.
- **Refresh `POST /auth/refresh` `@Public`** (`:65`, `RefreshTokenDto:79`): verifies refresh secret + `type==refresh`, reloads user (must be ACTIVE), re-issues pair. **No rotation blacklist/version — old refresh valid until `7d` exp.**
- **Logout `POST /auth/logout` `@Public`** (`:85`): no-op `{success:true,data:null}`. Revocation is client-only.
- **Me `GET /auth/me` `JwtAuthGuard`** (`:105`): `{id,name,email,phone,role,status,merchant,rider.hub,createdAt}`.
- **JWT** (`jwt/custom-jwt.service.ts`): manual HS256 `base64url.HMAC-SHA256`, `timingSafeEqual`, `alg==HS256`, `exp` check. Payload `{sub,email,phone,role,merchantId?,riderId?,hubId?,type}`. Secrets/expiry `config/auth.config.ts` (`JWT_ACCESS_SECRET/REFRESH_SECRET/…EXPIRES_IN 15m/7d`, dev fallback `dhruto_dev_*_32chars`).
- **Frontend storage** (`store/auth.slice.ts`, `lib/api/auth-token.ts`, `lib/api/base-api.ts`, `lib/auth/session.ts`): `localStorage dhruto_access_token|dhruto_refresh_token|dhruto_user`. `fetchBaseQuery baseUrl NEXT_PUBLIC_API_URL||http://localhost:4000/api/v1` + `Bearer`. Single-flight refresh on 401 (non-`/auth/*`), else `logout+resetApiState+assign(/{locale}/login)` only if on protected prefix. `useSignOut` best-effort `POST /auth/logout` + always clears `dhruto:lastParcelListUrl`.

## 3. Authorization (backend = authority)
- `@Public()` (skip JWT), `@Roles(...roles)` (metadata), `@CurrentUser()` (`decorators/*`).
- `JwtAuthGuard`: public→pass; else require `Bearer` (case-insensitive, quote-trim) → `verifyAccessToken` → `request.user:AuthenticatedUser`. 401 on missing/malformed/expired.
- `RolesGuard`: no `@Roles`→pass; `!user→403`; **`ADMIN→pass-all`** (`roles.guard.ts:29`); else `required.includes(role)` else 403.
- **Not global** (`app.module.ts:60-81` has only PIPE/FILTER/INTERCEPTOR): every controller must add `@UseGuards(JwtAuthGuard,RolesGuard[,RateLimitGuard])`. New controller that forgets = open. (P0 task in `15`.)
- Per-controller roles observed: auth public/me; parcels `MERCHANT,ADMIN` (+`assign-rider ADMIN,HUB_MANAGER`); tracking `@Public`; hubs class `@Roles(ADMIN,HUB_MANAGER)`; riders self `RIDER,ADMIN` / fleet `ADMIN,HUB_MANAGER`; finance wallet `MERCHANT` / cash `ADMIN,HUB_MANAGER` / admin `ADMIN`; merchants `MERCHANT,ADMIN`; pricing `MERCHANT,ADMIN`; analytics mixed per-route; notifications `MERCHANT,RIDER,HUB_MANAGER,ADMIN`; webhooks `MERCHANT`; intelligence mixed / admin `ADMIN`; integrations-admin `ADMIN`; health public.
- **Hub fine-grained** (`hub-permissions.ts:20-30`, `hub-authorization.service.ts:60+`): 8 `HubPermission` (view/scan/bag.create/bag.seal/manifest.create/dispatch/receive/exception.resolve). `ADMIN/HUB_MANAGER=ALL`, others `[]`. `HubUserAssignment{(userId,hubId) UQ, permissions jsonb, isActive}` is the grant; `assertHubAccess(hubIdOrCode,permission)` checks resolve→ACTIVE→ADMIN-bypass→assignment→permission, 403 `HUB_NOT_ACTIVE/FORBIDDEN/PERMISSION_DENIED`. Used on every `HubsService` op.
- **Tenant isolation:** `merchantId` on `Parcel,FinancialEntry,Settlement/Batch,PayoutRequest,Wallet,Notification(+userId),Webhook*,IntegrationFailure,Recipient*,RtoPrediction`; services scope by JWT ids (`requireMerchant/resolveMerchantId` throw `MERCHANT_NOT_FOUND`). `merchants.service.ts:107 getDefaultMerchant()` fallback exists but controllers avoid it (verify no caller uses it — task in `15`).

## 4. Frontend RBAC (UX only)
- `config/roles.ts`: `ROLE_CONFIG` (homes: ADMIN `/admin/dashboard`, MERCHANT `/merchant/dashboard`, HUB_MANAGER `/hub/dashboard`, RIDER `/rider/dashboard`, CUSTOMER `/track`), `asAppRole(unknown→MERCHANT)`, `canAccessSection`, `homeForRole`.
- `config/navigation.ts` (`NAV_BY_ROLE`, `BOTTOM_HREFS`, `navForRole/bottomNavForRole`): merchant 9 items (1 group); admin 5 groups; hub 6 ops + public track; rider 4 + public track; customer track-only.
- `DashboardShell` (`components/layout/dashboard-shell.tsx:110-147`): `!isAuthenticated→replace(/login)`; `!canAccessSection→replace(homeForRole)`. Each `(group)/layout.tsx` wraps shell + `robots:false`. `proxy.ts` does i18n + legacy 308s only (no server auth). `robots.ts` disallows protected prefixes (defence-in-depth, not auth).

## 5. Known RBAC gaps (→ `13`/`15`)
1. Self-register `ADMIN/HUB_MANAGER/RIDER` (P0). 2. No `@RateLimit` on `POST /auth/*` (P0). 3. No refresh rotation/revocation; logout no-op (P1). 4. Custom JWT + dev-secret fallback (P1). 5. Guards not global (P0). 6. `asAppRole→MERCHANT` default (P2). 7. `CUSTOMER` dead-end + `HUB_MANAGER` seed without assignment (P2). 8. `/:locale/analytics` role-switcher only checks MERCHANT (P1).
