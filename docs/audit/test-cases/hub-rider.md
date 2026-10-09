# Test Cases — Hub & Rider (F06–F10) — selected

| ID | Steps → expected | Automation | Status |
|---|---|---|---|
| TC-HUB-001 Scan inbound `POST /hubs/:id/scans` → `ParcelScan` + status; duplicate Key → dedupe; cross-hub → 403 | `hubs.e2e`, `hub-inbound.spec` | existing-unverified |
| TC-HUB-002 Lookup `GET /hubs/:id/parcels/:code` → recipient/district/weight/status (no full PII dump); unknown → 404 | `hub-inbound.spec` | existing-unverified |
| TC-HUB-003 Bag `POST /hubs/:id/bags` → OPEN; `POST /bags/:id/parcels` (raw body today → after DTO fix validated); seal → SEALED (Confirm); add-to-sealed → 409 | `hub-bagging.spec` | existing-unverified |
| TC-HUB-004 Manifest create (sealed-only, vehicle required) → dispatch (freeze) → receive (expected/received/missing/unexpected; `allowPartial` honored) | `hub-dispatch-receive.spec` | existing-unverified |
| TC-HUB-005 Exceptions `GET /exceptions?hubId&status` → resolve `{note≥3}`; no note → 422; wrong hub → 403 | via hubs e2e (NEW dedicated) | partial |
| TC-RIDER-001 Assign `POST /parcels/:id/assign-rider {riderId}` (ADMIN/HUB) → `ParcelAssignment`; raw-body gap → DTO fix; cross-hub → 403 | `delivery.e2e` | existing-unverified |
| TC-RIDER-002 Duty gate: OFF with in-progress → blocked; ON → tasks visible | `rider-dashboard` + `delivery.e2e` | existing-unverified |
| TC-RIDER-003 OTP: request (5/60) → verify `/^\d{6}$/` (10/60, TTL15m, max5, cooldown60s) → lock/expiry/concurrency cases | `delivery.e2e` (19) + `rider-delivery.spec` (5) | existing-unverified |
| TC-RIDER-004 Complete: COD must match; zero-COD ok; `Idempotency-Key` replay safe; concurrent completes → single win | `delivery.e2e`, `finance.e2e` | existing-unverified |
| TC-RIDER-005 Fail: reason enum + reschedule; attempts `(parcel,attempt) UQ`; history shows failed | `delivery.e2e` | existing-unverified |
| TC-RIDER-006 Hand-in `POST me/cash/hand-in` (+Key) → `CashHandIn` + items; summary correct | `riders.e2e`, `finance.e2e` | existing-unverified |
