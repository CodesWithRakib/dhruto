# W6 — Rider Assignment + Delivery (OTP + COD)

1. **Goal:** Parcel → rider → delivered + COD collected (or failed/rescheduled).
2. **Preconditions:** Rider `RIDER` (+duty ON, blocked if in-progress tasks); assign by `ADMIN|HUB_MANAGER`.
3. **Entry:** `/admin/rider` (`FleetRidersView` + assign modal) → `/rider/tasks[/:id]` (`rider-tasks-view`, `task-details-view`) → `/rider/history`, `/rider/dashboard`.
4. **Journey:** fleet assign `POST /parcels/:id/assign-rider {riderId}` (raw body, no DTO — gap) → rider starts `POST /riders/me/parcels/:id/start-delivery` → OTP `POST …/otp` (empty strict, `5/60`) → `POST …/verify-otp {otp /^\d{6}$/}` (`10/60`, TTL 15m, max 5, cooldown 60s per contracts) → complete `POST …/complete {otp?, cod?, remarks≤500, proofUrl≤2048}` (+opt Idempotency-Key; COD must match) / fail `POST …/fail {reason enum, resched, notes}` → history (`page1,limit100`).
5. **Entities:** `Parcel(status + otp_hash/expires/attempts/verified_at) + ParcelAssignment + DeliveryAttempt{(parcel,attempt) UQ} + CashLedger(parcel UQ, rider/handInStatus) + ParcelStatusHistory`.
6. **Failures:** OTP lock/expiry/concurrency; COD mismatch; cross-hub/rider isolation 403; duty-off gate; double-complete (idempotency + concurrency test).
7. **Success:** delivered + `CashLedger` row (amount/verified) → W7.
8. **Downstream:** finance (W7), notifications/webhooks (`parcel.delivered/failed`), risk features.
9. **Edge:** zero-COD; customer-unavailable → reschedule; proof URL optional; concurrent completion.
10. **Missing:** explicit pickup-request assignment; rider availability map; route optimization.
11. **Tests:** API `delivery.e2e-spec.ts` (19), `riders.e2e-spec.ts` (9), `auth-and-rider.e2e-spec.ts` (12); web `rider-delivery.spec.ts (5), rider-login, rider-bn-spot, rider-mobile`; contracts OTP constants `rider.schema.ts`.
