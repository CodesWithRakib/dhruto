# Phase 2 — 03 Confirmed Defects (code/test evidence only; no suspicions)

## D1 — F-OBS-01 extended: domain-event payloads omit relay-required fields (P1)
- **Files:** publishers `parcels.service.ts:374-393,870-883`, `riders.service.ts:507-517,967-977,1106-1116,1283-1295`, `finance.service.ts:357-367,482-491,581-591,657-666,1016-1026,1027-1036,1038-1048` vs relay `outbox-relay.service.ts:570-575` (`if (!merchantId) return`), `:654-656,681-696`, publisher `domain-event-publisher.service.ts:35-41` (persists payload only).
- **Repro:** book any parcel → `event_outbox` gains PUBLISHED `parcel.created.v1` → 20s+ later zero `webhook_deliveries` / `parcel_created` notifications (live DB evidence: 123 vs 0; `notifications-webhooks` test 7 red on baseline too).
- **Expected:** PARCEL_CREATED fans out to merchant in-app + email + subscribed webhooks (FANOUT `outbox-relay.service.ts:122-137`).
- **Actual:** all three targets silently skip; row still marked PUBLISHED (unrecoverable without re-emission).
- **Impact:** merchants get no booking/delivery/fail/payout/verify/settlement notifications or webhooks; only hand-in events work. Highest user-visible P1.
- **Fix options:** (a) merge `meta.merchantId` + `aggregateId` into outbox payload in `DomainEventPublisher.publish` (single point) + add missing template fields per event; (b) add fields at all 13 call sites. Recommend (a) + payload-contract unit test asserting `merchantId` presence per event type.

## D2 — Demo seed runs unguarded on every boot (P1)
- **Files:** `auth.service.ts:63-69` (`onModuleInit` → `seedDemoData:71-187`, no env check) creates `admin@dhruto.com/dhruto123` ADMIN + demo merchant/rider/hub-manager in any connected DB.
- **Repro:** boot app against any empty/migrated DB → known-password ADMIN exists (observed in `dhruto_phase0` seeding path; code path unconditional).
- **Expected:** seeds only for development/test/CI.
- **Fix:** gate on `NODE_ENV !== 'production'` (or explicit `SEED_DEMO_DATA=true`); document that production provisioning is admin-driven.

## D3 — `?mode=bulk` dead nav; bulk import nonexistent (P1)
- **Files:** `web-merchant/config/navigation.ts:67-68`, `merchant-dashboard.tsx:261-268` (disabled `futureFeature` badge) vs `bookings/new/page.tsx:1-26` (ignores query); backend grep `bulk` = ∅.
- **Expected:** nav matches capability. **Fix:** build bulk (XL) or delete the two nav entries (S). Owner decision in `05`.

## D4 — No parcel-cancel endpoint (P1)
- **Files:** matrix allows `CREATED|PICKUP_REQUESTED|PICKUP_ASSIGNED → CANCELLED` (`lifecycle:52-54`) but no `cancel` in `parcels.controller/service.ts`.
- **Expected:** reachable cancellation honoring the matrix + role policy. **Fix:** endpoint + policy (see `05`).

## D5 — Raw-body `assign-rider` / `bag-add` bypass validation (P1)
- **Files:** `parcels.controller.ts:255` `@Body("riderId")`, `hubs.controller.ts:286` `@Body("parcelTrackingCode")` (DTO `hub.dto.ts:48-56` exists but unused). Malformed input → 404/500 instead of 422; `undefined.trim()` can 500 on bag-add.
- **Fix:** `AssignRiderDto{riderId: IsUUID}` + wire `AddParcelToBagDto`; tests for 422 cases.

## D6 — No return initiation path; `PARCEL_RETURNED` unreachable (P1)
- **Files:** no `.../return|rto` route in `parcels/hubs/riders` controllers; `failDelivery` never emits `RTO_INITIATED`; zero `ParcelReturnedEvent` publishers.
- **Fix:** return-request endpoint + eligibility + publisher (see `05`/`07`).

## D7 — Exception re-resolve overwrites silently (P2)
- **Files:** `hubs.service.ts:1639-1643` (no already-RESOLVED guard).
- **Fix:** 409 on re-resolve (or explicit reopen flow) + test.

## D8 — Analytics/intelligence placeholder literals (P2)
- **Files:** `analytics.controller.ts:352-353` (`activeRiders/Hubs:0`), `:409` (`bottlenecks:[]`), `merchant/intelligence/page.tsx:59-86` statics.
- **Fix:** compute/remove each; tests asserting non-literal values.

## D9 — Idempotency key length not enforced (P3)
- **Files:** `parcels.controller.ts:68` (docs 16–128) vs `:90` (truthy check); column `varchar(128)`.
- **Fix:** enforce min/max → 422 + test.
