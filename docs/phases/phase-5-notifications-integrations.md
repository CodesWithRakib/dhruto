# Phase 5 — Notifications & Integrations

Event-driven communication layer for Dhruto. Domain transactions commit first;
notifications, SMS/email transport and merchant webhooks fan out afterwards and
can never roll back parcel, cash, settlement or payout state.

## Architecture

```
Domain Service (transaction)
  └─ Business rows + Outbox row (atomic, same DB transaction)
       └─ OutboxRelay (poll every OUTBOX_POLL_MS, SKIP LOCKED claim)
            ├─ Notification rows (dedupeKey = eventId:channel:recipient, orIgnore)
            │    ├─ IN_APP → SENT immediately
            │    └─ SMS/EMAIL → PENDING + BullMQ job (attempts 4, exp backoff 10s)
            │         └─ Worker → Provider → SENT / FAILED (transient throws → retry)
            └─ Webhook deliveries (unique subscription+eventId, reuses on race)
                 └─ BullMQ job (attempts 3, exp backoff 15s) → fetch 6s timeout
                      ├─ 2xx → DELIVERED
                      ├─ 4xx → DEAD_LETTER immediately (no infinite retry)
                      └─ 5xx/network/timeout → FAILED + nextRetryAt, then DLQ
```

Queue failure is never domain failure. Webhook failure is never business
failure. Outbox failure never rolls back the committed transaction — the relay
retries with exponential backoff (8 attempts, then FAILED for manual replay).

## Domain events (versioned, secret-free)

`parcel.created.v1`, `parcel.assigned.v1`, `parcel.out_for_delivery.v1`,
`parcel.delivered.v1`, `parcel.failed.v1`, `parcel.returned.v1`,
`cash.hand_in_submitted.v1`, `cash.verified.v1`, `settlement.created.v1`,
`payout.requested/approved/completed/failed.v1`,
`discrepancy.opened/resolved.v1`.

Envelope: `eventId, eventType, version (=1), occurredAt, aggregateType,
aggregateId, requestId, actorId?, payload`. Payloads carry only customer-safe,
non-secret data (tracking codes, amounts, phone numbers for routing). OTP
secrets never enter events — the OTP SMS is sent on the synchronous critical
path (`NotificationsService.sendDeliveryOtpSms`) with its own queued retry.

Event ownership: domain services append to the outbox inside the business
transaction. The relay owns all fan-out. Workers only orchestrate
event → provider → delivery record and never mutate parcel/wallet/settlement
state (stale-event protection).

## Outbox

Table `event_outbox` (`event_id` unique, `status` PENDING/PROCESSING/PUBLISHED/
FAILED, `attemptCount`, `availableAt`, `publishedAt`, `lastError`, index on
`(status, availableAt)`). `OutboxService.append/claimDueBatch/markPublished/
markAttemptFailed (exp 2^attempts*5s cap 5m, ≥8 → FAILED)/replay/stats`.

`OutboxRelayService` polls (`OUTBOX_POLL_MS`, default 3000ms), claims ≤25 rows
per tick with `SKIP LOCKED`, fans out per the `FANOUT` matrix, then marks
published/failed. When Redis is down, `enqueueOrInline` runs transport inline
and `sweepDueTransports` retries due webhook/old-pending notifications.

Fan-out matrix (see `outbox-relay.service.ts` `FANOUT`): parcel events notify
merchant in-app (+ email for created/delivered, + customer SMS for
delivered/failed), rider events target rider in-app, cash hand-in targets hub
+ rider in-app, financial events target merchant in-app + email (locked
categories bypass preferences) plus webhooks for created/assigned/OFD/
delivered/failed/returned/cash-verified/settlement-created/payout
requested/approved/completed/failed.

Deduplication: `dedupeKey = eventId:channel:recipientKey` with `orIgnore()` —
replaying the same event never duplicates notifications. Webhook deliveries
are unique on `(subscriptionId, eventId)`.

## Queues (BullMQ + Redis)

Queues: `notifications` (attempts 4, exp backoff 10s, removeComplete 1000,
removeFail 5000), `webhooks` (attempts 3, exp backoff 15s). Jobs carry
references (`{ notificationId }`, `{ deliveryId }`), never full entities or
secrets. `enqueueOrInline` degrades to inline execution when Redis is
unreachable. Processors: `NotificationsProcessor` → `transportNotification`;
`WebhooksProcessor` → `attemptDelivery`. `failed` listeners write
`IntegrationFailure` DLQ rows (unique `jobId` guard).

Retry classification (`providers.ts` `classifyHttpStatus/classifyNetworkError`):
TRANSIENT (timeout, network, 429/408, 5xx) → BullMQ retry with backoff;
PERMANENT (invalid recipient, 401/403 auth, 400/404/410/422) → FAILED without
retry. Normalized error codes: `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`,
`INVALID_RECIPIENT`, `AUTHENTICATION_FAILED`, `RATE_LIMITED`,
`INVALID_PAYLOAD`, `WEBHOOK_4XX`, `WEBHOOK_5XX`, `NETWORK_ERROR`,
`UNKNOWN_PROVIDER_ERROR`.

## Dead-letter + replay

`integration_failures` (`job_id` unique, `event_id`, `queue`, `kind`
WEBHOOK/SMS/EMAIL, `reference_id`, `merchant_id`, `reason`, `attempts`,
`status` OPEN/REPLAYED/RESOLVED). Admin-only `GET /admin/integrations/failures`,
`POST failures/:id/replay` (webhooks reset to PENDING + requeue with a fresh
job id; SMS/email requeue the notification job), `POST failures/:id/resolve`,
plus outbox `GET /admin/integrations/outbox` + `POST outbox/:id/replay`
(FAILED → PENDING). Replay is idempotent via dedupe keys and delivery
uniqueness — no duplicate domain transactions.

## Notifications

Channels: `IN_APP`, `SMS`, `EMAIL` (WhatsApp/push reserved). Persist-first:
rows are stored before transport, so delivery failure never destroys history.
Statuses: QUEUED/PENDING, PROCESSING, SENT, FAILED, RETRYING (via BullMQ),
CANCELLED; webhooks: PENDING/DELIVERED/FAILED/RETRYING/DEAD_LETTER.

Provider abstraction (`integrations/providers.ts`): `SmsProvider`,
`EmailProvider` (`send`, `normalize`, `getStatus` via `SendResult`).
`LogSmsProvider/LogEmailProvider` (default, explicit no-I/O, never logs
bodies) vs `HttpSmsProvider/HttpEmailProvider` (when `SMS_PROVIDER_URL+KEY` /
`EMAIL_PROVIDER_URL+KEY` are set, 8s timeout, classified results). Phone
normalization centralizes Bangladesh formats to `+8801XXXXXXXXX`.
Delivery records track provider, `providerMessageId`, `attemptCount`,
`sentAt/failedAt`, truncated `failureReason` — never secrets or OTPs.

Templates (`notifications/templates.ts`): 14 strictly-typed bilingual
templates (`parcel_created/assigned/out_for_delivery/delivered/failed/
returned`, `cash_hand_in_submitted/verified`, `settlement_created`,
`payout_requested/approved/completed/failed`, `discrepancy_opened`), each a
pure function of typed vars returning `{ en: { title, body }, bn: {...} }`.
Locale resolves from recipient preferences (`en` fallback). Missing required
vars fail the job with a clear reason instead of sending malformed text.

Preferences: `(user|merchant, category, channel, enabled, locale)`. Categories
`PARCEL_UPDATES` (opt-out allowed) vs `FINANCIAL_UPDATES`/`SECURITY_ALERTS`
(locked on, server-enforced in both service and relay). `GET/POST
/notifications/preferences` (30/min).

OTP: generation/validation stays in the rider domain; delivery goes through
the SMS provider. OTPs never appear in logs, webhooks, analytics, audit, or
notification metadata — SMS body only.

## Webhooks (outbound Dhruto → merchant)

Subscriptions: `GET/POST /webhooks/subscriptions`, `PATCH :id` (URL re-runs
SSRF validation, secrets immutable here), `DELETE :id`, `POST
:id/rotate-secret` (10/min, new secret returned once), `POST :id/ping`
(synthetic `webhook.ping`, no parcel/financial state). Events: `parcel.created/
assigned/out_for_delivery/delivered/failed/returned`, `cash.verified`,
`settlement.created`, `payout.requested/approved/completed/failed`, `*`.
Each endpoint has a `dhr_whsec_…` secret; list responses carry only
`secretPreview` (`abcd***wxyz`).

Signing: `HMAC-SHA256(secret, timestamp + "." + JSON(payload))`, header set
`X-Dhruto-Event/Delivery/Timestamp/Signature: t=…,v1=…`. Payload envelope:
`{ eventId, type, version (=1), timestamp, data }` — customer-safe only, with
`eventId` for merchant dedup and timestamps/versions for ordering. Delivery
records track `attemptCount`, `responseStatus`, truncated `responseBody`,
`nextRetryAt`, `lastAttemptAt`. Retry on timeout/connection/5xx with
`2^attempts*15s`; most 4xx go straight to dead-letter. Strict 6s fetch timeout
with abort. `POST deliveries/:id/retry` re-signs and requeues.

Security: `assertSafeWebhookUrl` rejects non-http(s), credentials in URL,
`localhost`, `127/8`, `10/8`, `172.16/12`, `192.168/16`, `0.0.0.0`,
`169.254/16` + metadata hosts, non-HTTPS in production, unresolvable hosts,
and any DNS `A/AAAA` resolving to a blocked address. Secrets never logged,
never returned except once on create/rotate. Merchant isolation: every query
is scoped by session-resolved `merchantId` (no fallback) — cross-merchant
access yields 404. Rate limits: create/update 30/min, rotate/ping 10/min,
retry 30/min.

## Security, rate limiting, audit

RBAC: notifications (merchant/rider/hub/admin, scope-derived), webhooks
(merchant, session merchant), admin integrations (admin only). Rate limits via
`CacheService` fixed window: test-sms 5/min, preferences 30/min, webhook
mutating routes as above, DLQ/outbox replay 30/min. Audit: webhook
created/updated/disabled/rotated/deleted, DLQ replayed/resolved, outbox
replayed, preferences changed — via structured logs + `IntegrationFailure`
trail (no dedicated audit table; parcel history remains append-only).
Request correlation: `requestId → eventId → jobId → providerMessageId` in
structured logs; bodies/secrets/OTPs never logged.

## Frontend

RTK Query (`baseApi` + `features/*/api/*`, `tagTypes` incl. `Notification`,
`Webhook`, `Integration`). Pages (all `noindex`, role layouts):

- Merchant `/merchant/notifications` (center + preferences), `/merchant/
  developer/webhooks` (endpoints, full 13-event picker, create/edit/
  enable-disable/rotate with show-once secret + copy, ping, delivery logs with
  payload inspector + replay).
- Rider `/rider/notifications`, hub `/hub/notifications` (center; rider keeps
  bottom-nav-safe mobile layout), admin `/admin/notifications` +
  `/admin/integrations` (queues, providers, DLQ with replay/resolve, outbox
  with replay, 15s polling).
- `NotificationBell` dropdown (15s unread poll, mark read/all-read, test-SMS
  modal with BD normalization hint); `NotificationCenter` (paginated, unread
  filter, safe deep-links to parcel/finance/task routes only); 
  `NotificationPreferences` (3×3 matrix + locale, locked rows disabled).

i18n: all strings via `messages/en.json` + `messages/bn.json`
(`Notifications`, `NotificationPreferences`, `AdminIntegrations`, nav keys);
no hard-coded copy in components. Design system: existing theme tokens only,
semantic states, keyboard/aria/focus support, loading/empty/error/pagination/
permission-denied states everywhere.

## Operations

Health: `GET /health`, `/health/metrics` (telemetry p50/p95/p99), admin
`GET /admin/integrations/overview|queues|outbox`. Metrics: notifications
sent/failed, SMS/email/webhook success rates, retry counts, queue
waiting/active/completed/failed/delayed, DLQ size, provider latency, outbox
pending/failed. Alert thresholds (to wire): webhook/SMS/email failure spikes,
DLQ growth, queue backlog, provider outage. Retention: notifications/webhook
deliveries/outbox/DLQ accumulate; no destructive cleanup ships — financial
communication history is retained for audit.

Env: `REDIS_URL/HOST/PORT`, `OUTBOX_POLL_MS`, `SMS_PROVIDER_URL/KEY`,
`EMAIL_PROVIDER_URL/KEY`, `WEBHOOK_TIMEOUT_MS`, `WEBHOOK_RETRY_BASE_MS`,
`WEBHOOK_MAX_ATTEMPTS`, `NOTIFICATION_DEFAULT_LOCALE` (see `.env.example`;
placeholders only, never real secrets).

## Testing

Unit: `templates.spec` (14 keys, event map, bilingual bodies, no secret
leak), `providers.spec` (BD normalization, log transports, status
classification, backoff), `webhook-security.spec` (HMAC sign/verify,
tamper/wrong-secret rejection, masking, event schema, dedupe keys),
`url-safety.spec` (localhost/127/private/link-local/metadata/protocol/
credentials/unresolvable rejection). Integration/queue: outbox claim/fan-out,
job creation/processing/retry/backoff/permanent-failure/DLQ/replay/
idempotency via relay + processors. Webhook matrix: 2xx/3xx/400/401/403/404/
429/500/timeout/network → correct retry/DLQ mapping. Security/RBAC:
merchant isolation (403/404), secret protection, SSRF, admin-only DLQ/replay,
rate limits. E2E: parcel lifecycle notifications (created → OFD OTP →
delivered/failed → returned), financial (settlement/payout → in-app + email +
webhook), webhook success + 500→retry→DLQ→replay, duplicate-event (no dup
notifications/financial actions), provider-down (domain still succeeds),
bn/en locale, isolation, SSRF, DLQ replay.
