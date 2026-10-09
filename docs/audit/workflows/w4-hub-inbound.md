# W4 — Hub Inbound (Scan → Inventory)

1. **Goal:** Hub manager → receive parcels into hub + reconcile inventory.
2. **Preconditions:** `ADMIN|HUB_MANAGER` + active `HubUserAssignment` + `hub.scan`/`hub.view`; `assertHubAccess` per op.
3. **Entry:** `/hub/scanner` (`hub-scanner.tsx`) + `/hub/parcels` (`parcel-lookup-view.tsx`) + `/hub/dashboard` (`hub-dashboard-view.tsx`) via `HubPageShell` (selector, `noHubs`/`loadingHubs`).
4. **Journey:** select hub → scan barcode (modes receiveInbound/bagParcel/receiveTransfer/sort, target bag, beep, camera fallback) `POST /hubs/:id/scans {barcode,scanType,bagId?,notes?,idempotencyKey?}` (`RateLimit600/60`) → `ParcelScan` append-only (+`UQ idempotency_key`) → lookup `GET /hubs/:id/parcels/:trackingCode` (+`GET /hubs/:id/inventory`) → dashboard KPIs (inbound/outbound/atHub/…).
5. **Entities:** `Hub, HubUserAssignment, Parcel(currentHubId), ParcelScan, ParcelStatusHistory, OperationalException` (on mismatch).
6. **Failures:** cross-hub 403; inactive hub 403; duplicate scan (idempotency); rejected vs duplicate messaging; invalid barcode 422.
7. **Success:** parcel `currentHubId` + status updated; scan history visible (`GET /hubs/:id/scans`).
8. **Downstream:** bagging (W5), exceptions (W8), analytics throughput.
9. **Edge:** wrong-hub scan; transfer receive partial; offline scanner (see `/offline` + PWA).
10. **Missing:** scanner hardware integration spec; bulk scan file; `hub/parcels` is lookup-only (no full list) — confirm intended.
11. **Tests:** API `hubs.e2e-spec.ts` (9: auth/cross-hub/scan/bag/manifest); web `hub-inbound.spec.ts (4), hub-bn-spot, hub-mobile.spec.ts`; unit `hub-routes/hub-i18n`.
