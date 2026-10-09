# 11 — Page Data & Table Specifications (Index)

> Per-table design: goal → columns → search/filters/sort → strategy (`10`) → page-size → counts → summaries → actions → export → states → backend/index → acceptance. Detail sheets in `pagination/`. Only decision-useful columns; proposed fields marked (NEW); no sensitive display merely because it exists (public tracking stays masked).

| Page (route) | Sheet | Strategy | Searchable | Default filters/sort | Export? |
|---|---|---|---|---|---|
| Merchant + Admin parcels (`/merchant/parcels`, `/admin/parcels`) | `pagination/parcel-list.md` | Offset default (+cursor opt) | tracking, recipient name/phone, district/thana | status tabs, district/thana/date; sort `createdAt DESC` | (NEW) CSV merchant-scoped / admin-full (perm-gated) |
| Parcel details Timeline (`/:id`) | `pagination/parcel-history.md` | Cursor (Timeline infinite) | — | `createdAt DESC` | no |
| Hub scans (`/hub/scanner` history) | `pagination/hub-scans.md` | Cursor | barcode | type/outcome; `createdAt DESC` | no |
| Bags (`/hub/bags`) + Manifests (`/hub/manifests`) | `pagination/bags-manifests.md` | Offset | code, destination | status; `createdAt DESC` | no |
| Exceptions (`/hub/exceptions`) | `pagination/exceptions.md` | Offset | parcel/manifest code | status OPEN default | no |
| Rider tasks (`/rider/tasks`) + History (`/rider/history`) | `pagination/rider-tasks.md` | Offset (tasks) + Offset history (unfix `page1/limit100`) | tracking/recipient | status filter; `createdAt DESC` | no |
| Fleet (`/admin/rider`) | `pagination/fleet.md` | Offset | rider name/code/phone | hub; performance sort | no |
| Wallet statement (`/merchant/finance` tab) | `pagination/wallet-statement.md` | Offset (`?type` + `page20`) | ref/type | type; `createdAt DESC` | (NEW) statement CSV |
| Payouts (merchant + admin) | `pagination/payouts.md` | Offset | payout code | status; `createdAt DESC` | admin CSV exists (keep) |
| Journal / Settlements / Batches (`/admin/finance`) | `pagination/admin-finance.md` | Offset | tx/batch/settlement code, merchant | type/status; `createdAt DESC` | CSV exists (journal/reports) |
| Cash hand-ins + discrepancies (`/hub/cash`) | `pagination/cash-desk.md` | Offset | handin/ledger code | status; `createdAt DESC` | no |
| Notifications (`*/notifications`) | `pagination/notifications.md` | Cursor (feed) + prefs form | — | unreadOnly; `createdAt DESC` | no |
| Webhook deliveries (`/merchant/developer/webhooks`) | `pagination/webhook-deliveries.md` | Offset (`?page/limit/status`) | event/url | ALL/DELIVERED/FAILED/DEAD_LETTER | no |
| Integration failures + outbox (`/admin/integrations`) | `pagination/integrations.md` | Offset (`?queue/status/page/limit`) | job/event id | status; `createdAt DESC` | no |
| Analytics sections (12) | `pagination/analytics.md` | Offset for tables + range presets for charts | merchant/rider/hub ids | preset + tz; per-section sort | report export (queue) exists |
| Intelligence overrides (`/admin/intelligence`) | `pagination/intelligence.md` | Offset | parcel/phone-hash (no raw phone) | status; `scoredAt DESC` | no |

## Column discipline (examples)
- Parcel list: tracking, recipient (name + masked phone), destination (district/thana), COD, status badge, hub/rider, updated. Never: full phone on public/admin-export without perm; money internals; otp hashes.
- Wallet: date, type badge, amount (signed ৳), balance-after, ref. Never: counterparty PII.
- See sheets for full column + summary-card + bulk/row-action specs.
