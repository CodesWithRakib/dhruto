# API — Finance (30) + Notifications (7) + Webhooks (8) + Integrations-admin (7)

## Finance (`finance.controller.ts:90 MERCHANT / :270 HUB / :367 ADMIN@admin/finance`)
Merchant: `GET wallet/me:97` | `GET wallet/transactions:112(?page/limit/type)` | `POST payouts/request:139 (amount≥100+accountDetails, Key?, 10/60)` | `GET payouts/me:176` | `GET payouts/:id:186(UUID)` | `POST payouts/:id/cancel:201 (10/60)` | `GET settlements/me:221` | `GET settlements/:id:250` — `finance.api` merchant hooks; `finance.e2e` (9).
HubCash (`ADMIN,HUB_MANAGER`): `GET reconciliation/pending:273` | `POST reconciliation/verify:293 ({ledgerUUID, actualAmount>0?, notes}, 60/60)` GAP zero-verify (P2) | `GET cash-handins:314(?status)` | `GET reconciliation/summary:335` | `GET discrepancies:344(?status)`.
Admin (`ADMIN`): `GET overview:371` | `GET payouts:380(?merchant/status/page/limit)` | `POST payouts/:id/approve:404 (30/60)` | `POST …/process:424 ({COMPLETED|FAILED|REJECTED}+refs, 30/60)` | `GET settlements:444` | `POST settlements/batches:468 ({merchantUUID, ids1-500}, 201)` | `GET …/batches:486` | `POST batches/:id/complete:501` | `POST discrepancies/:id/resolve:514 ({recovered, reason})` | `POST adjustments:533 ({CREDIT|DEBIT, ≤100M, reason}, Key?, 201)` | `POST transactions/:id/reverse:556 ({reason})` | `GET transactions:576` | `GET transactions/:id:600` | `GET reports/cod:612(?from/to/merchant/hub/rider/format)` | `GET reports/payouts:659` | `GET reports/fees:696` | `GET reconciliation/check:711(?merchantId)`. Orphan: `cancelSettlementBatch()` no route (P1). Tests `finance-ledger.e2e` (13).

## Notifications (`notifications.controller.ts:54`, all authed roles)
`GET me:78(?page/limit/unreadOnly)` | `GET unread-count:101` | `PATCH :id/read:116(UUID)` | `POST read-all:131` | `GET preferences:146` | `POST preferences:159 (1-20, en|bn, 30/60)` | `POST test-sms:175 (5/60)` GAP phone vs BD regex (P2); `useTestSms` unused. Tests `notifications-webhooks.e2e` (9), `templates.spec` (9).

## Webhooks (`webhooks.controller.ts:54`, `MERCHANT`)
`GET subscriptions:72` | `POST subscriptions:90 ({url IsUrl, events string[], secret≥16}, 201, 30/60)` GAP events enum (P2) | `PATCH :id:115` | `POST :id/rotate-secret:135 (10/60)` | `DELETE :id:153` | `POST :id/ping:166 (10/60)` | `GET deliveries:190(?page/limit/status)` | `POST deliveries/:id/retry:213 (30/60)`. Tests `webhook-security` (9), `url-safety` (7).

## Integrations-admin (`integrations-admin.controller.ts:48`, `ADMIN`)
`GET overview:52` | `GET queues:64` | `GET failures:72(?queue/status/page/limit)` | `POST failures/:id/replay:97 (30/60)` | `POST …/resolve:116 (30/60)` | `GET outbox:130` | `POST outbox/:id/replay:147 (30/60)`.
