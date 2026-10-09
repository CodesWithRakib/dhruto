# W2 — Parcel Creation (Single) + Pricing + Label

1. **Goal:** Merchant → priced parcel + tracking code + printable label.
2. **Preconditions:** `MERCHANT` (or ADMIN); `POST /parcels` requires `Idempotency-Key` header.
3. **Entry:** `/merchant/bookings/new` (`features/parcels/components/booking-form.tsx`, hooks `use-parcel-booking/use-parcel-pricing`) → success → `/merchant/parcels/:id` → `/label`.
4. **Journey:** fill recipient (name/phone/district/thana/address 5-300) + parcel (desc≤500, weight>0≤50kg, COD 0-500k) → debounced `POST /pricing/calculate` → `PricingSummary` → optional `SmartAddressFill POST /intelligence/parse-address` → submit `POST /parcels` (+`Idempotency-Key crypto.randomUUID`) → `BookingSuccess{trackingCode, view, print, book-another}` → details + `GET /parcels/:id/label` (barcode SVG `barcode.util.ts:119`).
5. **Forms/actions:** RHF `mode:onTouched`, Zod `parcels/schemas`; inline `AlertCard`, `Loader confirming`, pricing `calculating/unavailable/enterDestination`.
6. **API/rules:** `parcels.controller.ts:86` (`CreateParcelDto:create-parcel.dto.ts:17`, phone normalize+regex, `RateLimit30/60`); `pricing.controller.ts:110` (pure, no DB); service creates `Parcel + ParcelStatusHistory + IdempotencyRecord`, emits `parcel.created`.
7. **Entities/transitions:** `Parcel(status CREATED?) + ParcelStatusHistory` append-only; lifecycle service governs transitions (`lifecycle/parcel-lifecycle.service.ts`).
8. **Failures:** 422 validation; 409 idempotency conflict (same key+diff payload); 429; pricing unavailable → blocked submit.
9. **Success:** `tracking_code UQ` issued; visible in list/details/tracking; label printable.
10. **Downstream:** notifications/webhooks (`parcel.created`), intelligence (`RtoPrediction`), analytics.
11. **Edge:** zero-COD vs COD; weight boundaries; duplicate submit (idempotency); district/thana free-text vs geo dataset.
12. **Missing:** bulk import UI/API (nav `?mode=bulk` ignored → Missing); parcel edit/cancel UI (Missing); pickup scheduling (Missing).
13. **Tests:** API `parcels.e2e-spec.ts` (29), `parcels.service.spec.ts` (8), `lifecycle.spec.ts` (20), `pricing.service.spec.ts` (17); web `create-parcel.spec.ts, booking.smoke.spec.ts, booking-form.test.tsx, pricing-summary.test.tsx`. Missing: idempotency-race, pricing-boundary, address-parse-fail cases.
