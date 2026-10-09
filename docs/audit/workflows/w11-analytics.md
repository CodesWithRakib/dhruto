# W11 — Analytics + Reports + Alerts

1. **Goal:** Merchant/Admin → operational + financial insight + exports + alert triage.
2. **Entry:** `/merchant/analytics` (`merchant-analytics-dashboard`) + `/admin/analytics` (`admin-overview-dashboard`) + `/admin/analytics/:section` (12 sections) + `/:locale/analytics` (role-switcher, unguarded — gap) + dashboard `merchant-dashboard` KPIs.
3. **Journey:** select preset/range (`AnalyticsRangeQueryDto: preset today/yesterday/7d/30d/month/last-month/90d/custom + timezone + hub/rider/merchant + limit1-200`) → `GET /analytics/metrics|overview|parcels|delivery|hubs|riders|riders/me|merchants|rto/v2|cod/v2|finance|notifications|webhooks|intelligence` (mixed `@Roles`, cache `wrap 120-180s`) + legacy `merchant/summary|operations/overview|hubs/throughput|riders/performance|rto|cod` → alerts `GET /alerts?status + POST /alerts/evaluate (ADMIN 10/60) + POST /alerts/:id/ack` → reports `GET /reports + POST /reports {dataset∈EXPORT_DATASETS, format, range}` (+Key, `10/60`, BullMQ `analytics-exports`) → `GET /reports/:id/download`.
4. **Entities:** reads `Parcel/History/DeliveryAttempt/CashLedger/Settlement/Merchant/Rider/HubUserAssignment/Notification/WebhookDelivery/AddressParse/RiskSnapshot/RtoPrediction`; writes `AnalyticsAlert{dedup UQ} + ReportExport{idempotency UQ}`.
5. **Failures:** unknown `:section` renders empty (no 404); `activeRiders:0,activeHubs:0` hardcoded in `buildOverview` (placeholder metrics); export limits (1MB body, 30s statement timeout — see `13`).
6. **Success:** tenant-isolated numbers (e2e asserts cross-tenant denial); CSV/XLSX downloads; alert ack loop.
7. **Edge:** timezone Asia/Dhaka; empty ranges; large exports (queue, not inline).
8. **Missing:** scheduled reports; dashboard drill-down links (Partial); `/analytics` guard + de-dupe.
9. **Tests:** API `analytics.e2e-spec.ts` (11: isolation/deny/KPIs/funnel/alerts/CSV), `analytics-range.spec.ts` (9); web unit `dashboard-overview (8), dashboard-sections (9), dashboard-overview-i18n`; no dedicated analytics e2e (gap).
