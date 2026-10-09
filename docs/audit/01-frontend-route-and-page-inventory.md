# 01 — Frontend Route & Page Inventory (57 `page.tsx`)

> Source: `apps/web-merchant/app/**` glob + `config/{routes,roles,navigation,route-base}.ts` + `proxy.ts` + `store/auth.slice.ts` + `components/layout/dashboard-shell.tsx`. `(group)` is NOT in URL. `[locale]` = `/:locale` (`en|bn`, `src/i18n/routing.ts`, `proxy.ts` legacy 308s + intl middleware).

## 1. Totals
| Group | Pages | URL prefix | Layout / guard |
|---|---|---|---|
| public | 10 | `/:locale/`, `/track*`, `/services`, `/pricing`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms` | `(public)/layout.tsx` (public chrome), no guard |
| auth | 2 | `/login`, `/register` | `(auth)/layout.tsx`, guest, `robots:false` |
| merchant | 12 | `/merchant/*` | `DashboardShell section=merchant`, client guard `isAuthenticated + canAccessSection` → `/login` |
| admin | 14 | `/admin/*` | `DashboardShell section=admin`, same guard |
| hub | 10 | `/hub/*` | `DashboardShell section=hub` |
| rider | 6 | `/rider/*` | `DashboardShell section=rider` |
| ungrouped | 3 | `/analytics`, `/offline`, `/*` catch-all | role-switcher / PWA fallback / `notFound()` |
| **Total** | **57** | + `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `icon`, `apple-icon`, `icons/*` routes | per-page `robots:false` on protected/auth |

## 2. Full route table (path → file → component → API → status)
Status = Implemented but not verified unless noted (no test execution in this pass).

### Public (10)
| Route | Page file (`app/[locale]/…`) | Feature component | API | Notes/status |
|---|---|---|---|---|
| `/` | `(public)/page.tsx` | `features/marketing/*` (hero, stats, marquee, services, stacking-ops, rate-calc, coverage, pipeline, testimonials, FAQ, contact) | none (static + `messages Home`) | Implemented but not verified |
| `/track` | `(public)/track/page.tsx` | `tracking/track-hero,track-features-bento,track-protocol` + `public-tracking-view` | `parcels.api useGetPublicTrackingQuery` (`GET /tracking/:code`, public) | Implemented but not verified |
| `/track/:code` | `(public)/track/[code]/page.tsx` | same + command header + `TrackingQuickSearch` | same | Implemented but not verified |
| `/services` | `(public)/services/page.tsx` | `services/*` (7 blocks) | none | Implemented but not verified |
| `/pricing` | `(public)/pricing/page.tsx` | `pricing/*` (cockpit, curve, tiers, matrix, FAQ) | none (static; calculator preview may call pricing later — verify) | Implemented but not verified |
| `/about` | `(public)/about/page.tsx` | `about/*` | none | Implemented but not verified |
| `/contact` | `(public)/contact/page.tsx` | `contact/*` (smart-form static) | none | Implemented but not verified |
| `/faq` | `(public)/faq/page.tsx` | `faq/faq-container` | none | Implemented but not verified |
| `/privacy` | `(public)/privacy/page.tsx` | `privacy/*` | none | Implemented but not verified |
| `/terms` | `(public)/terms/page.tsx` | `terms/*` | none | Implemented but not verified |

### Auth (2)
| Route | File | Component | API | Notes |
|---|---|---|---|---|
| `/login` | `(auth)/login/page.tsx` | `auth/login-form` → `setCredentials` → `homeForRole` | `auth.api useLoginMutation POST /auth/login` | Implemented but not verified; `rememberMe` UI-only |
| `/register` | `(auth)/register/page.tsx` | `auth/register-form` (role fixed `MERCHANT`) | `useRegisterMutation POST /auth/register` | Implemented but not verified; no ADMIN/HUB/RIDER signup UI |

### Merchant (12)
| Route | File | Component | API | Notes |
|---|---|---|---|---|
| `/merchant/dashboard` | `(merchant)/merchant/dashboard/page.tsx` | `dashboard/merchant-dashboard` + overview/kpis/needs-attention/recent/perform. | `merchants.api useGetMerchantDashboardQuery` + `analytics.api useGetMerchantAnalyticsQuery` | Implemented but not verified |
| `/merchant/bookings/new` (+`?mode=bulk` nav variant, same file) | `bookings/new/page.tsx` | `parcels/booking-form` + `use-parcel-booking` (Idempotency-Key) + `use-parcel-pricing` + `SmartAddressFill` | `POST /parcels`, `POST /pricing/calculate`, `POST /intelligence/parse-address` | Implemented (single) but not verified; **bulk `?mode=bulk` ignored → UI-only/mocked** (no CSV/XLSX UI; grep `bulk\|mode` only form `mode:onTouched`) |
| `/merchant/parcels` | `parcels/page.tsx` | `parcels/parcel-list` (tabs, search `/` shortcut, filter sheet, sort, pagination) | `useGetParcelsQuery GET /parcels?...` (URL `useQueryState`) | Implemented but not verified |
| `/merchant/parcels/:id` | `parcels/[id]/page.tsx` | `parcel-details-view` + `ParcelIntelligencePanel` | `GET /parcels/:id` + `GET /intelligence/parcels/:id/intelligence` | Implemented but not verified; no edit/delete UI |
| `/merchant/parcels/:id/label` | `parcels/[id]/label/page.tsx` | `shipping-label-view` (4×6 print, barcode) | `GET /parcels/:id/label` | Implemented but not verified |
| `/merchant/finance` | `finance/page.tsx` | `finance-dashboard` + `wallet-card,transactions-table,payouts-view,settlements-view,payout-request-modal` (`?tab`,`?type`) | merchant finance endpoints (wallet/tx/payouts/settlements) | Implemented but not verified |
| `/merchant/analytics` | `analytics/page.tsx` | `merchant-analytics-dashboard` (FilterBar, KPI grid, volume, COD, RTO, district, hub/rider, export) | `analytics.api` overview/delivery/RTO-v2/COD-v2 + `useListReports` | Implemented but not verified |
| `/merchant/intelligence` | `intelligence/page.tsx` | `smart-address-parser,rto-risk-meter,address-confirmation` + static KPI strip (`64/64,240+,v1,100%` hardcoded) | `parse/evaluate-risk/parse-v2/confirm` | Partially implemented (tools real, hero KPIs placeholder) |
| `/merchant/notifications` | `notifications/page.tsx` | `notification-center` + `notification-preferences` | `notifications.api` list/read/prefs | Implemented but not verified; **orphan (no sidebar entry)** — reachable via bell only |
| `/merchant/developer/webhooks` | `developer/webhooks/page.tsx` | inline CRUD (13 `AVAILABLE_EVENTS`, secret-once, rotate/ping/replay, DLQ filter, 10s poll deliveries) | `webhooks.api` all 8 hooks | Implemented but not verified; nav label `settings` is confusing |
| `/merchant/track` | `track/page.tsx` | `public-tracking-view` (`trackBase` merchant-aware) | `GET /tracking/:code` (public API in authed shell) | Implemented but not verified |
| `/merchant/track/:code` | `track/[code]/page.tsx` | same | same | Implemented but not verified |

### Admin (14)
| Route | File | Component | API | Notes |
|---|---|---|---|---|
| `/admin/dashboard` | `admin/dashboard/page.tsx` | `admin/admin-console` (4 static cards → parcels/finance/hub/rider) | none | **Placeholder router** (real KPIs in `/admin/analytics`) |
| `/admin/parcels` | `admin/parcels/page.tsx` | same `parcel-list` via `ADMIN_ROUTE_BASE` (no create button) | `GET /parcels` | Implemented but not verified |
| `/admin/parcels/:id` | `admin/parcels/[id]/page.tsx` | same details | `GET /parcels/:id` | Implemented but not verified |
| `/admin/parcels/:id/label` | `admin/parcels/[id]/label/page.tsx` | same label | `GET /parcels/:id/label` | Implemented but not verified |
| `/admin/finance` | `admin/finance/page.tsx` | `admin-finance-dashboard` (journal/settlements/batches/payouts/adjustments/reports/check + CSV) | admin finance 17 endpoints | Implemented but not verified |
| `/admin/hub` | `admin/hub/page.tsx` | reuses `hub-dashboard-view` + selector | `hubs.api` dashboard + exceptions | Implemented but not verified |
| `/admin/rider` | `admin/rider/page.tsx` | `FleetRidersView` + assign modal | `riders.api` fleet + `assignParcelToRider` | Implemented but not verified |
| `/admin/analytics` | `admin/analytics/page.tsx` | `admin-overview-dashboard` | `overview` + `alerts` | Implemented but not verified |
| `/admin/analytics/:section` | `admin/analytics/[section]/page.tsx` | `admin-section-dashboard` (12 valid: parcels/delivery/hubs/riders/merchants/rto/cod/finance/notifications/intelligence/alerts/reports) | 12 conditional analytics queries + ack/report | Implemented but not verified; **nav exposes only 5/12**; unknown section renders empty (no `notFound`) |
| `/admin/intelligence` | `admin/intelligence/page.tsx` | `admin-intelligence-dashboard` | `intelligence-admin.api` versions/metrics/overrides/import | Implemented but not verified; **orphan** |
| `/admin/notifications` | `admin/notifications/page.tsx` | `notification-center` only | notifications list/read | Implemented but not verified; **orphan** |
| `/admin/integrations` | `admin/integrations/page.tsx` | `admin-integrations-dashboard` (queues/DLQ/outbox) | `integrations.api` 7 hooks | Implemented but not verified; **orphan** |
| `/admin/track` | `admin/track/page.tsx` | `public-tracking-view` (`trackBase` admin) | public tracking | Implemented but not verified |
| `/admin/track/:code` | `admin/track/[code]/page.tsx` | same | same | Implemented but not verified |

### Hub (10)
| Route | File | Component | API | Notes |
|---|---|---|---|---|
| `/hub/dashboard` | `hub/dashboard/page.tsx` | `hub-dashboard-view` (KPIs, scans, quick actions) via `HubPageShell` | `useGetHubDashboard + useGetExceptions` | Implemented but not verified |
| `/hub/scanner` | `hub/scanner/page.tsx` | `hub-scanner` (modes receive/bag/transfer/sort, beep, camera fallback) | `useScanBarcode + useGetBags(OPEN) + useGetScans` | Implemented but not verified |
| `/hub/parcels` | `hub/parcels/page.tsx` | `parcel-lookup-view` (lookup by code, no full list) | `useLazyLookupParcel + useGetHubInventory` | Partially implemented (lookup-only by design?) |
| `/hub/bags` | `hub/bags/page.tsx` | `bag-manager` (create open bag, destination+notes) | `useGetBags/CreateBag/SealBag/DestinationHubs` | Implemented but not verified (no delete) |
| `/hub/bags/:id` | `hub/bags/[id]/page.tsx` | `bag-details-view` (add-by-scan, seal confirm) | `useGetBagById/AddParcel/Seal` | Implemented but not verified |
| `/hub/manifests` | `hub/manifests/page.tsx` | `manifest-manager` (vehicle required, sealed-bags-only) | `useGetManifests/Create/Dispatch` | Implemented but not verified |
| `/hub/manifests/:id` | `hub/manifests/[id]/page.tsx` | `manifest-details-view` (dispatch freeze, receive reconcile + partial) | `useGetManifestById/Dispatch/Receive` | Implemented but not verified |
| `/hub/exceptions` | `hub/exceptions/page.tsx` | `exceptions-view` (resolve + required note) | `useGetExceptions/ResolveException` | Implemented but not verified; **orphan** |
| `/hub/cash` | `hub/cash/page.tsx` | `finance/hub-cash-desk` (pending/batches/discrepancies, verify confirm) | hub-cash 5 endpoints | Implemented but not verified |
| `/hub/notifications` | `hub/notifications/page.tsx` | `notification-center` | notifications | Implemented but not verified; **orphan** |

### Rider (6)
| Route | File | Component | API | Notes |
|---|---|---|---|---|
| `/rider/dashboard` | `rider/dashboard/page.tsx` | `rider-dashboard` (KPIs, duty toggle blocked if in-progress, start-next) | `useGetRiderDashboard/Tasks + useSetDuty` | Implemented but not verified |
| `/rider/tasks` | `rider/tasks/page.tsx` | `rider-tasks-view` (filter all/assigned/inProgress/attempted, search, call/map) | `useGetRiderTasks + useStartDelivery` | Implemented but not verified |
| `/rider/tasks/:id` | `rider/tasks/[id]/page.tsx` | `task-details-view` (start → OTP 6-digit → COD-match → complete / fail w/ reschedule) | task-details + start/OTP/verify/complete/fail | Implemented but not verified |
| `/rider/history` | `rider/history/page.tsx` | `rider-history-view` (filter, `৳` COD) | `useGetRiderHistoryQuery(page1,limit100)` | Implemented but not verified |
| `/rider/profile` | `rider/profile/page.tsx` | `rider-profile-view` (code/hub/status, cash hand-in) | profile/cash-summary/handins + duty/hand-in | Implemented but not verified |
| `/rider/notifications` | `rider/notifications/page.tsx` | `center + prefs` | notifications | Implemented but not verified; **orphan** |

### Ungrouped (3) + system routes
| Route | File | Notes |
|---|---|---|
| `/analytics` | `[locale]/analytics/page.tsx` | Role-switcher (`MERCHANT?Merchant:Admin` dashboards), no `DashboardShell`, no guard. **Duplicates** grouped analytics → recommend removal/redirect. |
| `/offline` | `[locale]/offline/page.tsx` | PWA fallback, `robots:false`. By design, no nav. |
| `/*` | `[locale]/[...rest]/page.tsx` → `not-found.tsx` | `LocaleNotFound` (links `/` + `/track`). |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/icon`, `/apple-icon`, `/icons/*` | `app/robots.ts` (disallows `/*/merchant,admin,hub,rider,login,register,/api/`), `sitemap.ts` (9 public × en/bn = 18 URLs), `manifest.ts` (shortcuts rely on `proxy.ts` locale redirect), `icon.tsx`/`icons/*/route.tsx` | Implemented but not verified |

## 3. Role-by-route access matrix (frontend intent; backend is authority)
`AppRole = ADMIN|MERCHANT|HUB_MANAGER|RIDER|CUSTOMER` (`config/roles.ts`). `canAccessSection` + `DashboardShell` client guard; `isProtectedRoute` for `/merchant,/admin,/hub,/rider`.

| Route prefix | ADMIN | MERCHANT | HUB_MANAGER | RIDER | CUSTOMER (public-only) |
|---|---|---|---|---|---|
| `/` + public pages + `/track*` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login`, `/register` | guest | guest | guest | guest | guest |
| `/merchant/*` | ✅ (sections include merchant) | ✅ | ❌ → `homeForRole` (`/hub/dashboard`) | ❌ → `/rider/dashboard` | ❌ → `/track` |
| `/admin/*` | ✅ | ❌ → `/merchant/dashboard` | ❌ | ❌ | ❌ |
| `/hub/*` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/rider/*` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `/analytics` (ungrouped) | ✅ (admin view) | ✅ (merchant view) | ⚠️ falls to admin view (role-switcher only checks MERCHANT) | ⚠️ admin view | ⚠️ admin view — **broken/inconsistent, needs guard** |
| Evidence | `ROLE_CONFIG ADMIN sections:[public,admin,merchant,hub,rider]` | `MERCHANT [public,merchant]` | `HUB_MANAGER [public,hub]` | `RIDER [public,rider]` | `CUSTOMER [public]` |

Note: hiding nav ≠ authorization. Backend `@Roles` is authoritative (see `02`). Frontend matrix above is UX intent only.

## 4. Nav-vs-router gaps (must-fix orphans / dead links)
- **Orphans (no `NAV_BY_ROLE` entry):** `/merchant/notifications`, `/admin/intelligence`, `/admin/notifications`, `/admin/integrations`, `/hub/exceptions`, `/hub/notifications`, `/rider/notifications`, `/:locale/analytics`. Evidence: `config/navigation.ts` vs `app/**` glob.
- **Dead links:** `DashboardShell` profile `/{section}/settings` → zero `settings/page.tsx` (404); `?mode=bulk` → ignored by `BookingForm`; manifest shortcuts rely on locale redirect.
- **Cross-namespace:** hub/rider nav `TRACKING_ITEM` points to public `/track` (outside shell) — intentional but inconsistent chrome.
- **Label mismatches:** merchant `intelligence` labelled `reports`, `webhooks` labelled `settings` (`messages Nav`); admin analytics nav 5/12 sections.
- **Missing CRUD:** no parcel edit page (details is read-only + label/print); no `merchants/me` profile UI despite `PATCH /merchants/me` + `merchants.api useUpdateMerchantProfileMutation`; no `settings/*` pages.

Full per-page specs: `pages/`.
