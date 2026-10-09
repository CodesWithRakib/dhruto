# Pages — Hub (10) + Rider (6) + Ungrouped (3)

## Hub (`(hub)/layout.tsx` → `DashboardShell section=hub`; pages wrapped in `HubPageShell` selector)
- **`/hub/dashboard`** → `hub-dashboard-view` (KPIs inbound/outbound/atHub/bags/manifests/exceptions + scans + quick actions scan/lookup/bag/manifest/receive/cash).
- **`/hub/scanner`** → `hub-scanner` (modes receive/bag/transfer/sort, target bag, beep, camera fallback, duplicate vs rejected). API scan + open bags + scans history.
- **`/hub/parcels`** → `parcel-lookup-view` (code lookup + inventory snippet; lookup-only, no full list — confirm intent per `11`).
- **`/hub/bags` + `/:id`** → `bag-manager` (create destination+notes) + `bag-details-view` (add-by-scan, seal Confirm, sealed/inTransit/received banners). No delete.
- **`/hub/manifests` + `/:id`** → `manifest-manager` (vehicle required, sealed-only) + `manifest-details-view` (dispatch freeze, receive scan + partial + expected/received/missing/unexpected).
- **`/hub/exceptions`** (orphan) → `exceptions-view` (resolve + required note). Add to nav Operations.
- **`/hub/cash`** → `hub-cash-desk` (pending/batches/discrepancies; verify counted+notes Confirm `Verify cash and settle?`; resolve +recovered).
- **`/hub/notifications`** (orphan) → `notification-center`. Add to nav.
- Tests: `hub-inbound (4), hub-bagging (2), hub-dispatch-receive (1), hub-bn-spot, hub-mobile (3)` + `hub-routes/hub-i18n` unit.

## Rider (`(rider)/layout.tsx` mobile-first `pb-28`)
- **`/rider/dashboard`** → `rider-dashboard` (assigned/inProgress/deliveredToday/failedToday/codToCollect/inHand + duty toggle blocked if in-progress + start-next). API dashboard + tasks + duty.
- **`/rider/tasks`** → `rider-tasks-view` (filter all/assigned/inProgress/attempted + search + call/map/details). API tasks + start.
- **`/rider/tasks/:id`** → `task-details-view` (start → OTP 6-digit + resend/attempts → COD-match → complete +remarks / fail reason+reschedule; delivered banner).
- **`/rider/history`** → `rider-history-view` (filter all/delivered/failed, `৳`; fixed `page1/limit100` — unfix per `10`).
- **`/rider/profile`** → `rider-profile-view` (code/hub/status/since + cash in-hand/awaiting/verified + hand-in notes).
- **`/rider/notifications`** (orphan) → `center + prefs`. Add to nav More.
- Tests: `rider-login (2), rider-delivery (5), rider-bn-spot, rider-mobile (2)` + `rider-routes/rider-i18n` unit.

## Ungrouped
- **`/:locale/analytics`** → role-switcher (MERCHANT?Merchant:Admin), no shell/guard, duplicates grouped analytics. REMOVE/redirect (P1).
- **`/:locale/offline`** → PWA fallback (`OfflineState`), by design nav-less.
- **`/:locale/*`** → `notFound()` (`LocaleNotFound`).
