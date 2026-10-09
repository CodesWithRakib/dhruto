# API — Hubs (20) + Riders (16)

## Hubs (`hubs.controller.ts:54`, `@Controller()` root, class `@Roles(ADMIN,HUB_MANAGER)`, per-op `assertHubAccess`)
- `GET /api/v1/hubs:67 listHubs` | `useGetHubs` | `hubs.e2e` | ok
- `GET /hubs/destinations:85` (before `:id`) | `useGetDestinationHubs` | same | ok
- `GET /hubs/:id:102` (uuid|code) | `useGetHubById` | same | ok
- `GET /hubs/:id/dashboard:116` | `useGetHubDashboard` | same | ok
- `GET /hubs/:id/inventory:133` | `useGetHubInventory` | same | ok
- `POST /hubs/:id/scans:148 → HubScanDto(barcode3-64/scanType/bagId?/notes≤500/key8-128) → 600/60` | `useScanBarcode` | same | ok
- `GET /hubs/:id/scans:171 (?type/outcome/limit)` | `useGetScans` | same | ok
- `GET /hubs/:id/parcels/:trackingCode:197 lookupParcel` | `useLazyLookupParcel` | `hub-inbound` | ok
- `POST /hubs/:id/bags:220 → CreateBagDto(destUUID/sealTag≤100/notes≤500)` | `useCreateBag` | `hub-bagging` | ok
- `GET /bags:240 (?hubId/status)` | `useGetBags` | same | ok
- `GET /bags/:id:262 (UUIDv4)` | `useGetBagById` | same | ok
- `POST /bags/:id/parcels:278 → @Body parcelTrackingCode (NO DTO) → 300/60` | `useAddParcelToBag` | same | GAP: use `AddParcelToBagDto` (P1)
- `POST /bags/:id/seal:300 → SealBagDto(sealTag2-100)` | `useSealBag` | same | ok
- `POST /hubs/:id/manifests:322 → CreateManifestDto(dest/bagIds1-200/vehicle3-50/driver/notes)` | `useCreateManifest` | `hub-dispatch-receive` | ok
- `GET /hubs/:id/manifests:343` | `useGetManifests` | same | ok
- `GET /manifests/:id:356` | `useGetManifestById` | same | ok
- `POST /manifests/:id/dispatch:374 → 60/60` | `useDispatch` | same | GAP: verify idempotency key (task)
- `POST /manifests/:id/receive:395 → ReceiveManifestDto(codes≤500/allowPartial) → 120/60` | `useReceive` | same | ok
- `GET /exceptions:422 (?hubId/status)` | `useGetExceptions` | via hubs e2e | ok
- `POST /exceptions/:id/resolve:441 → ResolveExceptionDto(note3-500)` | `useResolveException` | same | ok

## Riders (`riders.controller.ts:60 self RIDER,ADMIN + :393 admin ADMIN,HUB_MANAGER`)
Self: `GET me/dashboard:75` | `GET me/tasks:90(?status)` | `GET me/tasks/:parcelId:115(UUID)` | `GET me/history:135(?page/limit/status)` | `GET me/profile:161` | `POST me/duty:174 SetDutyDto` | `POST me/parcels/:id/start-delivery:194` | `POST me/deliveries/:id/otp:218 (5/60)` | `POST …/verify-otp:239 (/^\d{6}$/, 10/60)` | `POST …/complete:266 (otp?/cod?/remarks≤500/proofUrl≤2048 +Key?)` | `POST …/fail:304 (reason enum)` | `POST me/cash/hand-in:326 (+Key?)` | `GET me/cash/handins:357` | `GET me/cash/summary:372` — consumers `riders.api` terminal hooks; tests `delivery.e2e` (19), `riders.e2e` (9), `rider-delivery.spec` (5). Admin: `GET /riders:397(?hubId)` | `GET /riders/:id:415(UUID)` — `useGetFleetRiders/FleetRider` + assign (parcels P6).
