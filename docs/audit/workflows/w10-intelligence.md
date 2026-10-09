# W10 — Intelligence (Address + Risk + RTO)

1. **Goal:** Clean Bangla/mixed addresses + recipient risk call + RTO guidance at booking and ops time.
2. **Entry:** `/merchant/intelligence` (parser + risk meter + confirmation + static KPIs) + booking `SmartAddressFill` + parcel details `ParcelIntelligencePanel` + `/admin/intelligence` (versions/metrics/overrides/import).
3. **Journey:** parse `POST /intelligence/parse-address {raw 3-500}` / v2 `{raw, hint?, candidates?, max1-10}` → confirm `POST /address/confirm {parseUUID, candidate, manualStructure?, reason≤500}` → risk `POST /evaluate-risk|/analyze-booking {phone≥10, cod≥0, raw≥3, district?, thana?, weight?}` → `RecipientRiskSnapshot + RtoPrediction{parcel UQ} + IntelligenceRecommendation` → override `POST /recommendations/:id/override|accept|dismiss` → feedback `POST /feedback {subjectType, signal∈FEEDBACK_SIGNALS}` → geo search `GET /geography/search?q&limit` → admin import `POST /admin/intelligence/geography/import` (5/300) + versions/metrics/overrides.
4. **Entities:** `GeoDatasetVersion{version UQ} + GeoPlace{code UQ} + AddressAlias{normalized UQ} + AddressParse + AddressConfirmation + RecipientFeatureAggregate{UQ phone+merchant, bigint minors, HMAC-only} + RecipientRiskSnapshot + RtoPrediction + IntelligenceRecommendation + IntelligenceFeedback + ScoringModel{UQ name+version}`. Phones never plaintext (`phone-hash.util.ts`, pepper `INTELLIGENCE_PHONE_PEPPER`).
5. **Data:** `intelligence/data/bangladesh-locations.ts` (64 districts asserted in e2e); `geoDataService.ensureImported() + modelRegistry.ensureDefaults()` on seed.
6. **Failures:** parse-fail → manual confirm; low confidence → HOLD recommendation; import idempotent versioning.
7. **Success:** confirmed normalized address + district/thana mapping; risk score without bias (unit asserts no religion/ethnicity/health bias).
8. **Edge:** non-standard English + Bangla script; missing thana; high-COD + new recipient.
9. **Missing:** bulk address review queue UI (Partial); model retraining pipeline (Blocked/external).
10. **Tests:** API `intelligence.e2e-spec.ts` (9), `intelligence-v2.e2e-spec.ts` (10: `districts=64 version=bd-geo-2026-10`), unit `normalization (8), phone-hash (4), address-intelligence (8), address-load (1), risk-rto (12)`; web bn-spot specs.
