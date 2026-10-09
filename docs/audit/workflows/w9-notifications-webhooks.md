# W9 — Notifications + Webhooks + Integrations

1. **Goal:** Actors notified (in-app/SMS/email) + merchant systems integrated via webhooks; failures observable + replayable.
2. **Entry:** `*/notifications` (`notification-center` ×4, prefs merchant+rider) + bell (`useGetUnreadNotificationCountQuery` polling) → `/merchant/developer/webhooks` (CRUD + deliveries 10s poll + replay) → `/admin/integrations` (overview/queues/DLQ/outbox).
3. **Journey:** domain event → `DomainEventPublisher` (outbox append in-tx + `SKIP LOCKED` poller → notifications/webhooks fan-out) → BullMQ (`notifications` attempts4/10s, `webhooks` attempts3/15s, `analytics-exports` ×2) → transport (SMS/email log-fallback if provider keys missing) / `attemptDelivery` (HMAC `X-Dhruto-Signature`, timestamp, replay guard) → `Notification{dedupe UQ}` / `WebhookDelivery{UQ(sub,event)}` → DLQ `IntegrationFailure{job UQ}` → admin replay/resolve; outbox `EventOutbox{event UQ}` → replay.
4. **API:** `GET /notifications/me?unreadOnly + /unread-count + PATCH /:id/read + POST /read-all + GET|POST /preferences (1-20 prefs, locale en|bn) + POST /test-sms (5/60)`; webhooks 8 (list/create/patch/rotate/delete/ping/deliveries/retry); admin integrations 7 (overview/queues/failures+replay/resolve/outbox+replay).
5. **Entities:** `Notification(+merchant/user CASCADE, dedupe UQ, provider/attempts/template/locale) + NotificationPreference{(user|merchant,channel,category) partial UQ} + WebhookSubscription{merchant CASCADE} + WebhookDelivery + EventOutbox + IntegrationFailure`.
6. **Failures:** provider down → `enqueueOrInline` inline fallback; webhook fail → DLQ + `markDeadLetter`; out-of-order → `event_id` dedupe.
7. **Success:** prefs honored; deliveries DELIVERED; DLQ/outbox empty; `resolveRoute` whitelist safe deep-links.
8. **Edge:** secret rotation (old invalid immediately — verify grace); ping vs real event; locale fallback (`NOTIFICATION_DEFAULT_LOCALE`).
9. **Missing:** real SMS/email provider wiring (Blocked if keys absent — log transport); push notifications; template editor UI (`templates.ts` code-only).
10. **Tests:** API `notifications-webhooks.e2e-spec.ts` (9), `templates.spec.ts` (9), `providers.spec.ts` (11), `url-safety.spec.ts` (7), `webhook-security.spec.ts` (9); web e2e none dedicated (bell covered indirectly).
