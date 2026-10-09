# Other Tables — Condensed Specs (see `_template.md` for full shape)

## parcel-history (Timeline in `/:id`)
Cursor `createdAt DESC, id DESC`, infinite scroll; no counts/export; states skeleton→empty (`No events yet`)→error+Retry. Backend `GET /:id/history` append-only read; index `(parcel+created)` exists.

## hub-scans (scanner history)
Cursor, filter type/outcome, search barcode; no export. Backend `GET /hubs/:id/scans?scanType&outcome&limit`; indexes `(parcel|hub+created, bag)` exist.

## bags-manifests (`/hub/bags`, `/hub/manifests`)
Offset (`page/limit/total`), search code/destination, filter status, sort `createdAt DESC`; row Open/Seal/Dispatch/Receive (detail page); no export. Backend `GET /bags?hubId&status`, `GET /hubs/:id/manifests`; indexes `(origin|dest+status, createdAt)` exist; enforce 200-bag / 500-scan limits in UI copy.

## exceptions (`/hub/exceptions`)
Offset, default `status=OPEN`, search parcel/manifest, row Resolve (note required). Backend `GET /exceptions?hubId&status`; indexes exist.

## rider-tasks + history + fleet
Tasks: offset + status filter (all/assigned/inProgress/attempted) + search; row Start/Call/Map/Details. History: offset — UNFIX frontend `page1/limit100` → param `?page&limit&status`. Fleet (`/admin/rider`): offset + `?hubId` + search rider/code; row Assign (modal). Backend `GET me/tasks?status`, `GET me/history?page&limit&status`, `GET /riders?hubId`.

## wallet-statement + payouts + admin-finance + cash-desk
All offset with `total`. Wallet: `?type` filter (URL tab), NEW statement CSV (merchant-scoped). Payouts: status filter; merchant Request/Cancel (confirm + amount); admin Approve/Process (confirm + refs). Journal/settlements/batches: CSV exists (keep, ADMIN-gated). Cash-desk: tabs pending/batches/discrepancies; Verify (counted+notes, confirm `Verify cash and settle?`); Resolve (+recovered). Backend per `05`; money displayed ৳ major, stored minor (see `06§3`).

## notifications (feed) + webhook-deliveries + integrations + analytics + intelligence-overrides
Notifications: cursor feed (`?unreadOnly`), mark-read/all-read; prefs form (1-20, locale). Deliveries: offset + `ALL|DELIVERED|FAILED|DEAD_LETTER` + 10s poll + Replay. Failures/outbox: offset + `?queue&status&page&limit` + Replay/Resolve. Analytics: range presets + tz + per-section tables (offset) + export queue (`POST /reports` → download). Overrides: offset + status, no raw phone (hash only).
