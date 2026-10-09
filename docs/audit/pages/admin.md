# Pages — Admin (14 routes)

> Layout: `(admin)/layout.tsx` → `DashboardShell section=admin`.

- **`/admin/dashboard`** → `admin-console` (4 static cards, no API) = placeholder router (F-UX-03). RECOMMENDATION: replace with live overview (reuse `AdminOverviewDashboard` summary).
- **`/admin/parcels[/:id[/label]]`** (3) → same `parcel-list/details/label` via `ADMIN_ROUTE_BASE` (create hidden). API same parcels endpoints (admin scope = all).
- **`/admin/finance`** → `admin-finance-dashboard` (journal/settlements/batches/payouts/adjustments/reports/check + CSV + approve/process/reverse/adjust/batch confirms). API admin finance 17. Tests: `finance-admin (2)`.
- **`/admin/hub`** → reuses `hub-dashboard-view` + selector (supervision). API dashboard + exceptions.
- **`/admin/rider`** → `FleetRidersView` (fleet table, live counts, assign modal + audit). API fleet 2 + assign. Tests via `delivery.e2e`.
- **`/admin/analytics`** → `admin-overview-dashboard` (KPIs/trends/alerts). API overview + alerts.
- **`/admin/analytics/:section`** → `admin-section-dashboard` (12 valid; nav shows 5). API 12 conditional + ack/report. Gap: unknown section empty (add `notFound()`); hardcoded `activeRiders/Hubs:0`.
- **`/admin/intelligence`** (orphan) → `admin-intelligence-dashboard` (versions/metrics/overrides/import). Add to nav.
- **`/admin/notifications`** (orphan) → `notification-center` only. Add to nav.
- **`/admin/integrations`** (orphan) → `admin-integrations-dashboard` (providers/queues/DLQ/outbox + replay/resolve). Add to nav.
- **`/admin/track[/:code]`** (2) → `public-tracking-view` (admin `trackBase`).
