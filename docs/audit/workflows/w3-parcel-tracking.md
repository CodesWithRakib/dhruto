# W3 — Parcel List / Search / Tracking

1. **Goal:** Merchant/Admin/Customer → find parcels + track lifecycle.
2. **Entry:** `/merchant/parcels` + `/admin/parcels` (`parcel-list.tsx`, `use-parcels-list.ts`, `useQueryState`) → `/:id` (`parcel-details-view.tsx` + `ParcelIntelligencePanel`) → `/track[/:code]` (`public-tracking-view.tsx`).
3. **Journey:** list (tabs 6 statuses, search `/` shortcut, filter sheet district/thana/date, sort, pagination, `lastListUrl` remember) → row → details (5 milestones + RTO branch, recipient/pricing/ops/hub/rider, `whatsNext`, Timeline desc) → label/print → public track (search + sample chips `DHR-2610-00101…`, 5-stage progress, masked phone, share/copy).
4. **API:** `GET /parcels?page/limit/sort/order/status/search/district/thana/from/to/cursor` (`ParcelListQueryDto`), `GET /parcels/:id` (uuid|code), `GET /parcels/:id/history`, `GET /parcels/:id/label`, `GET /tracking/:code` (`@Public`, public-safe projection).
5. **Entities:** `Parcel` (+indexes incl. Phase8 `(merchant,status,createdAt DESC)`), `ParcelStatusHistory`, `ParcelScan`, `RtoPrediction`.
6. **Validation/failures:** list `ErrorState+Retry`, empty-filtered vs empty-none; details `belongs to another merchant` + retry/back; tracking `NotFoundState + samples`.
7. **Success:** correct tenant scoping (merchant sees own; admin all); deep links work; back preserves list URL.
8. **Downstream:** none (read-only) except analytics views.
9. **Edge:** cursor vs offset (both DTO fields; see `10`); out-of-range pages; data changes mid-pagination; masked PII on public.
10. **Missing:** saved views/column config; export from list (admin finance has CSV, list does not); edit/cancel actions.
11. **Tests:** API `parcels.e2e-spec.ts`, `parcels-cursor.e2e-spec.ts`, `parcels-cursor.spec.ts`; web `parcel-list.spec.ts, parcel-details.spec.ts, parcel-next-step.spec.ts, public-tracking.spec.ts, public-and-routes.spec.ts` + unit `parcel-list-*.test.*, parcel-card, parcel-copy-button, query-state, last-list-url`.
