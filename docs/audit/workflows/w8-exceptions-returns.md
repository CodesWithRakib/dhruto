# W8 — Exceptions + Returns / RTO

1. **Goal:** Operational exception → resolved; failed delivery → return-to-origin.
2. **Entry:** `/hub/exceptions` (`exceptions-view.tsx`, orphan) + parcel history Timeline + `/hub/dashboard` (exception KPIs).
3. **Journey:** system/operator creates `OperationalException{hub, parcelId?, manifestId?, status}` → hub lists `GET /exceptions?hubId&status` → resolve `POST /exceptions/:id/resolve {note 3-500}` (+`hub.exception.resolve` perm). Failed delivery (`FailDeliveryDto reason+resched`) → attempts (`DeliveryAttempt`) → RTO branch in details view → `RtoPrediction{parcel UQ}` + `RecipientRiskSnapshot`.
4. **Entities:** `OperationalException{(hub+status, status+created, parcel, manifest) indexes}`, `DeliveryAttempt`, `ParcelStatusHistory`, `RtoPrediction`, `RecipientFeatureAggregate{UQ phone+merchant}`.
5. **Failures:** resolve without note (422); cross-hub resolve 403; unknown-section analytics renders empty.
6. **Success:** exception CLOSED with note; parcel RTO state visible in history/tracking.
7. **Downstream:** analytics RTO, intelligence feedback (`POST /intelligence/feedback`).
8. **Edge:** lost/damaged (no explicit reason enum observed — verify `FailDeliveryDto` values); return-leg scans (same scan types reused — verify).
9. **Missing:** dedicated returns list/page + RTO settlement rules (Partial); exception auto-creation rules undocumented; customer return request (Missing).
10. **Tests:** API `delivery.e2e-spec.ts` (fail/reschedule), `hubs.e2e-spec.ts`; web `parcel-next-step.spec.ts`. Missing: RTO E2E, exception-permission matrix.
