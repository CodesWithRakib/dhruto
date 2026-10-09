# 08 — Integration & Dependency Map

## 1. Frontend → API (RTK Query → Nest)
| Frontend client (`features/*/api/*.api.ts`) | Base | Endpoints consumed | Notes |
|---|---|---|---|
| `auth.api.ts` (login/register/logout/me) | `lib/api/base-api.ts` (`NEXT_PUBLIC_API_URL\|\|http://localhost:4000/api/v1`, Bearer, single-flight refresh, tags) | `POST /auth/*`, `GET /auth/me` | Dual-shape tokens; `rememberMe` UI-only |
| `parcels.api.ts` (7 hooks) | same | `POST /parcels`, `GET /parcels`, `GET /:id`, `GET /:id/history` (unused), `GET /:id/label`, `GET /tracking/:code`, `POST /pricing/calculate` (via pricing? actually parcels api includes pricing mutation) | `Idempotency-Key` on create; history hook unused |
| `riders.api.ts` (terminal + fleet) | same | 16 rider endpoints | `Idempotency-Key` on complete/hand-in |
| `hubs.api.ts` (19 hooks) | same | 20 hub endpoints | per-hub auth server-side |
| `finance.api.ts` (22 hooks) | same | 30 finance endpoints (merchant+hub+admin) | Keys on payout/adjust |
| `merchants.api.ts` (profile/update/dashboard) | same | 3 merchants endpoints | update mutation unused by UI |
| `analytics.api.ts` (20+) | same | 26 analytics endpoints | cache `wrap` server-side; 10s poll on webhooks (not analytics) |
| `notifications.api.ts` (7) | same | 7 notifications endpoints | bell polling; test-SMS unused |
| `webhooks.api.ts` (8) | same | 8 webhooks endpoints | deliveries 10s poll |
| `integrations.api.ts` (7) | same | 7 integrations-admin endpoints | admin-only; polling overview/outbox |
| `intelligence.api.ts` + `intelligence-admin.api.ts` (15) | same | 17 intelligence endpoints | static KPIs not bound |
| `observability.api.ts` | same | `GET /health/metrics*` presumably | **no route consumes it** (backend-only surface) |

## 2. Backend → DB (module → entities)
auth→User/Merchant/Rider/Hub/Assignment; parcels→Parcel/History/Merchant/User/Wallet/Rider/Assignment/HubAssignment/Idempotency; riders→Rider/Parcel/Assignment/Attempt/Cash*/Hub/User; hubs→Hub/Assignment/Bag/BagParcel/Manifest/Item/Parcel/Scan/History/Exception/User; finance→Wallet/Tx/Payout/Settlement/Batch/Cash*/FinTx/Entry/Parcel/Merchant (+`ledger.service`); merchants→Merchant/User/Parcel/Wallet; analytics→Parcel/History/Attempt/Cash/Settlement/Merchant/Rider/Assignment/Notification/Delivery/Parse/Snapshot/Rto/Alert/Export; notifications→Notification/Preference/Merchant/User/Failure; integrations→Failure/Delivery/Outbox; intelligence→Parse/Confirm/Geo/Alias/Aggregate/Snapshot/Rto/Rec/Feedback/Model/Parcel/Merchant; pricing→none; webhooks→Subscription/Delivery/Merchant/Failure/Outbox; health→DataSource/Cache/Queues.

## 3. Queues / events / external
- **BullMQ** (`queues.module.ts`): `notifications` (4 tries/10s) + `webhooks` (3/15s) + `analytics-exports` (2) — verify 3rd registration (see `05`). `removeOnComplete1000/removeOnFail5000`. `queue-helper enqueueOrInline` (inline when Redis down — fail-open).
- **Events:** `DomainEventPublisher` (outbox in-tx + `SKIP LOCKED` poller → notifications/webhooks); `AuditEventListener` trace-only (`parcel.created/delivered/failed`, `finance.payout_requested/completed`).
- **External:** SMS (`SMS_PROVIDER_URL/KEY`), email (`EMAIL_PROVIDER_URL/KEY`) → log transport fallback if absent (Blocked without keys); webhook delivery (HMAC `X-Dhruto-Signature`, timeout `WEBHOOK_TIMEOUT_MS`, retries `WEBHOOK_RETRY_BASE_MS/MAX_ATTEMPTS`); Upstash Redis optional (`UPSTASH_*` → `rediss://`); geo dataset import (local `bangladesh-locations.ts` + `ensureImported`).
- **Contracts:** `@dhruto/contracts` Zod (14 schemas) consumed at event/outbox boundary + `implements` on DTOs; `@dhruto/ui` primitives consumed by web (`transpilePackages`).

## 4. Dependency risks
1. **Redis single point:** cache fallback (memory) + queue inline fallback mask outages but break rate-limit accuracy + job durability (AOF `everysec` bounds loss). Needs Redis-down e2e (task).
2. **No api/web Docker services:** `docker-compose.yml` infra-only; CI starts API+web via pnpm (not images) → prod parity gap (see `13`).
3. **Secret/env drift:** `NEXT_PUBLIC_SITE_URL` used but absent from examples; `apps/api/.env` missing pool/timeout/outbox/provider/pepper keys (defaults silently); real `.env` files committed (see `13` P0).
4. **Orphan surfaces:** `observability.api` (no consumer), `cancelSettlementBatch` (no route), `useGetParcelHistoryQuery`/`useTestSms`/`useUpdateMerchantProfile` (no UI) — remove or wire.
5. **Dual query shapes (analytics legacy vs v2) + offset+cursor (parcels)** — consolidate per `10` to avoid client drift.
