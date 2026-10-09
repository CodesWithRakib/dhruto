# W5 — Bagging + Manifests (Dispatch → Receive)

1. **Goal:** Hub → consolidate parcels into bags → manifests → dispatch → destination receive + reconcile.
2. **Preconditions:** `ADMIN|HUB_MANAGER` + `bag.create/seal`, `manifest.create/dispatch/receive` perms.
3. **Entry:** `/hub/bags[/:id]` (`bag-manager.tsx`, `bag-details-view.tsx`) + `/hub/manifests[/:id]` (`manifest-manager.tsx`, `manifest-details-view.tsx`).
4. **Journey:** create bag `POST /hubs/:id/bags {destHub, sealTag?, notes?}` → add parcel `POST /bags/:id/parcels {parcelTrackingCode}` (raw body, no DTO — gap) → seal `POST /bags/:id/seal {sealTag}` (Confirm) → create manifest `POST /hubs/:id/manifests {destHub, bagIds[1-200], vehicle3-50, driver, notes}` (sealed-only) → dispatch `POST /manifests/:id/dispatch` (freeze) → receive `POST /manifests/:id/receive {scannedBagCodes≤500, allowPartial}` → reconcile expected/received/missing/unexpected.
5. **Entities:** `Bag(bag_code UQ) + BagParcel{(bag,parcel) UQ + partial UQ(parcel) WHERE active} + Manifest(manifest_code UQ) + ManifestItem{(manifest,bag) UQ, CHECK bag XOR parcel} + ParcelScan + OperationalException`.
6. **Failures:** adding to sealed/dispatched bag; unsealed bag in manifest; dispatch twice; partial receive (allowed iff `allowPartial`); missing/unexpected bags → exceptions.
7. **Success:** sealed → dispatched → received states; `BagParcel.is_active` + `ManifestItem` consistent.
8. **Downstream:** rider assignment (W6) at destination; finance unaffected until delivery.
9. **Edge:** bag with 200 bags/manifest limit; 500 scan codes/receive limit; concurrent add+seal race.
10. **Missing:** bag delete/unseal; manifest edit/cancel; vehicle/driver master data.
11. **Tests:** API `hubs.e2e-spec.ts` + `delivery.e2e-spec.ts` (cross-hub); web `hub-bagging.spec.ts (2), hub-dispatch-receive.spec.ts (1)`.
