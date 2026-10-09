# Test Cases — Parcels (F02/F04/F05) — selected

| ID | Route/feature | Level | Steps → expected | Neg/edge | Automation | Status |
|---|---|---|---|---|---|---|
| TC-PARC-001 | `POST /parcels` happy | e2e | valid + `Idempotency-Key` → 201 `tracking_code` + history row + `parcel.created` event | missing key → 400/422 (verify); same key+same payload → replay same; same key+diff → 409 | `parcels.e2e` (29) | existing-unverified |
| TC-PARC-002 | Booking validation | unit/e2e | phone normalize, COD 0-500k, weight ≤50, address 5-300 → 422 shape `{VALIDATION_ERROR, errors[]}` | BD phone variants; over-limit weight/COD | `parcels.service.spec`, `booking-form.test` | existing-unverified |
| TC-PARC-003 | `POST /pricing/calculate` | unit | district/thana/weight/cod → fee breakdown; missing `codAmount` → today 400 (gap, fix `@IsOptional`) | zero-COD; heavy; unknown district | `pricing.service.spec` (17) | existing-unverified |
| TC-PARC-004 | `GET /parcels` isolation + filters | e2e | merchant A ↛ B parcels; admin sees all; `?status&district&search&from&to` filter; `sort/order` allowlist | unknown sort → 400; out-of-range → last page | `parcels.e2e`, `parcels-cursor.e2e` | existing-unverified |
| TC-PARC-005 | Cursor round-trip | integration | `mode=cursor` → `nextCursor` opaque → tamper → 400; filter change → 409 (after impl) | null ts; data-shift ±1 | `parcels-cursor.spec` (2) + NEW | partial |
| TC-PARC-006 | `GET /:id` + history + label | e2e/frontend | uuid + code both resolve; cross-merchant → 403/404 `belongs to another merchant`; label SVG renders + prints | unknown id → 404; history order DESC | `parcel-details.spec`, `parcel-next-step` | existing-unverified |
| TC-PARC-007 | `GET /tracking/:code` public | e2e/security | valid → masked phone, no money/ids/notes; invalid → 404 + samples UI | scraping (rate 60/min) → 429 | `public-tracking.spec` | existing-unverified |
| TC-PARC-008 | List UX states | frontend | loading skeleton → filtered-empty (`clear`) vs none (`create`) → error + Retry; URL sync + back via `lastListUrl` | debounce 300ms; `/` shortcut | `parcel-list-view/filters/query-state/last-list-url` unit + `parcel-list.spec` | existing-unverified |
| TC-PARC-009 | Lifecycle transitions | unit | `lifecycle.service` valid/invalid transitions (20 cases) | RTO branch; assign→deliver→fail | `parcel-lifecycle.spec` (20) | existing-unverified |
