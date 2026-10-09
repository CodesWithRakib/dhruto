# Pages — Merchant (12 routes)

> Layout: `(merchant)/layout.tsx` → `DashboardShell section=merchant` (client guard). `ADMIN_ROUTE_BASE` vs `MERCHANT_ROUTE_BASE` (`config/route-base.ts`) keeps details/label namespaced.

- **`/merchant/dashboard`** → `merchant-dashboard` (overview/kpis/needs-attention/recent/performance). API `GET /merchants/me/dashboard` + `GET /analytics/merchant/summary`. States skeleton/chart/list + empty + error. Tests: `dashboard-overview (8), dashboard-sections (9), dashboard-overview-i18n`.
- **`/merchant/bookings/new`** → `booking-form` (recipient/destination/parcel/COD + `PricingSummary` + `BookingSuccess` + `SmartAddressFill`). API `POST /parcels` (Key) + `POST /pricing/calculate` (debounced) + `POST /intelligence/parse-address`. `?mode=bulk` ignored (F03 gap). Tests: `create-parcel (3), booking.smoke, booking-form.test, pricing-summary.test`.
- **`/merchant/parcels`** → `parcel-list` (tabs/search/sheet/sort/pagination, `useQueryState`, `lastListUrl`). API `GET /parcels`. See `pagination/parcel-list.md`. Tests: `parcel-list.spec` + 5 list unit.
- **`/merchant/parcels/:id`** → `parcel-details-view` (5 milestones + RTO branch, recipient/pricing/ops/hub/rider, `whatsNext`, Timeline) + `ParcelIntelligencePanel`. API `GET /:id` + intel. No edit (F-UX-01). Tests: `parcel-details/next-step.spec`.
- **`/merchant/parcels/:id/label`** → `shipping-label-view` (4×6, barcode). API `GET /:id/label`.
- **`/merchant/finance`** → `finance-dashboard` (`?tab&?type`: statement/payouts/settlements + `WalletCard/TransactionsTable/PayoutsView/SettlementsView/PayoutRequestModal`). API merchant finance 8. Tests: `finance-merchant (2), finance-bn-spot, finance-mobile, finance.test, finance-i18n/routes`.
- **`/merchant/analytics`** → `merchant-analytics-dashboard` (FilterBar/KPI/volume/COD/RTO/district/hub-rider/export). API overview/delivery/RTO-v2/COD-v2 + reports. Tests: dashboard unit (no dedicated e2e — gap).
- **`/merchant/intelligence`** → parser + risk meter + confirmation + static KPIs (P1 gap: bind `GET /intelligence/health|metrics`).
- **`/merchant/notifications`** (orphan) → `notification-center` + prefs. Via bell only (F-NAV-01).
- **`/merchant/developer/webhooks`** → full CRUD (13 events, secret-once, rotate/ping/replay, DLQ filter, 10s poll). Nav label `settings` → rename.
- **`/merchant/track[/:code]`** → `public-tracking-view` (merchant `trackBase`) over public API in authed shell.
