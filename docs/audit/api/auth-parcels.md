# API — Auth (5) + Parcels/Tracking (7) + Pricing (1) + Merchants (3)

## Auth (`auth.controller.ts:12`)
- `POST /api/v1/auth/register → register:23 → RegisterDto(:16) → @Public` | `auth.api useRegister` | `auth-and-rider.e2e` | GAP: any role (P0), no rate-limit (P0)
- `POST /auth/login → login:45 → LoginDto(:65) → @Public` | `useLogin` | same | GAP: no rate-limit (P0)
- `POST /auth/refresh → refresh:65 → RefreshTokenDto(:79) → @Public` | reauth flow | same | GAP: no rotation (P1)
- `POST /auth/logout → logout:85 → none → @Public` (no-op) | `useLogout` | `auth-session` | GAP: no revocation (P1)
- `GET /auth/me → getMe:105 → @CurrentUser → JwtAuthGuard` | `useGetMe` | same | ok

## Parcels (`parcels.controller.ts:53` + `tracking.controller.ts:25`)
- `POST /parcels → createParcel:86 → CreateParcelDto(:17) + Idempotency-Key! → MERCHANT,ADMIN → 30/60` | `useCreateParcel` | `parcels.e2e` (29) | ok
- `GET /parcels → listParcels:127 → ParcelListQueryDto → MERCHANT,ADMIN → 120/60` | `useGetParcels` | `parcels.e2e` + cursor | GAP: offset+cursor dual (P1, see `10`)
- `GET /parcels/:id → getParcelById:159 → uuid|code → MERCHANT,ADMIN → 180/60` | `useGetParcelById` | same | ok
- `GET /parcels/:id/history → getParcelHistory:192 → same → MERCHANT,ADMIN → 180/60` | `useGetParcelHistory` (UNUSED by pages) | — | orphan hook (P3)
- `GET /parcels/:id/label → getShippingLabel:223 → same → MERCHANT,ADMIN → 60/60` | `useGetShippingLabel` | — | ok
- `POST /parcels/:id/assign-rider → assignRider:255 → @Body riderId (NO DTO) → ADMIN,HUB_MANAGER → 60/60` | `useAssignParcelToRider` | `delivery.e2e` | GAP: add DTO (P1)
- `GET /tracking/:trackingCode → getTracking:43 → PublicTrackingResponseDto → @Public → 60/60` | `useGetPublicTracking` | `public-tracking` | ok (masked)

## Pricing (`pricing.controller.ts:106`)
- `POST /pricing/calculate:110 → PricingCalculationDto(:40) → MERCHANT,ADMIN → 120/60` | `useCalculatePricing` | `pricing.service.spec` (17) | GAP: `codAmount` needs `@IsOptional` (P2)

## Merchants (`merchants.controller.ts:17`, `MERCHANT,ADMIN`, no RateLimit)
- `GET /merchants/me:20` | `useGetMerchantProfile` | — | ok
- `PATCH /merchants/me:42 → UpdateMerchantDto` | `useUpdateMerchantProfile` (UNUSED — no page) | — | backend-only (P2, add settings page)
- `GET /merchants/me/dashboard:68` | `useGetMerchantDashboard` | dashboard unit | ok
