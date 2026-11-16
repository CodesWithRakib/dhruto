# Communication Platform — Phase 5 Report

Date: 2026-11-16 · Scope: logistics workflows and parcel-linked messaging.

**Status: COMPLETE WITH DOCUMENTED LIMITATIONS.** All server-side workflows are implemented and verified end to end against disposable PostgreSQL/Redis; UI entry points are verified by component tests and a production build. Browser E2E was not executed (see `PHASE-5-TEST-REPORT.md` §4).

## 1. Logistics integrations

- **Parcel lifecycle → chat sync** through the existing transactional outbox: a new relay target calls a chat-side handler only for committed `parcel.*` events; it reconciles membership and posts a controlled system message, idempotently per event.
- **Rider reassignment lifecycle fixed** (Phase 2 finding): the previous rider's row becomes `REMOVED` (workflow, audited), their sockets are revoked immediately via `chat.participant_removed.v1`, the new rider is admitted, history and authorship are preserved; reassigning back re-admits; moderator removals are never overridden.
- **Contextual entry points** for every role, using backend get-or-create only.
- **Parcel context** (tracking code, status) on conversation list and header, with role-aware navigation back to the parcel.
- **Global unread badge** on every role's Messages navigation item.
- **Staff access hardening** and **customer identity alignment** (approved decisions, `PHASE-5-IMPLEMENTATION.md` §1).

## 2. Workflows supported

Customer ↔ rider (delivery thread), parcel-linked operations (merchant, hub manager, admin with reason), merchant ↔ operations (merchant desk), rider ↔ hub manager (parcel thread scoped to the current hub; existing `HUB_OPERATIONS`), support escalation (audited intervention). Matrix: `PHASE-5-WORKFLOW-MATRIX.md`.

## 3. Routes and UI

No new routes (existing `/{role}/messages/[conversationId]`). New/changed components: `OpenConversationButton`, `StaffReasonDialog`, `ParcelContextBar`, `ChatUnreadBadge`; changed `ParcelDetailsActions` (merchant/admin), `RiderTaskDetailsPage`, `CustomerActiveShipmentCard`, `ParcelLookupView` (hub), `Messenger`/`ConversationSidebar` (merchant "Contact operations"), `ConversationPanel`, `MessageBubble` (system text), `DashboardShell` + navigation (`indicator`).

## 4. Backend services and APIs

New: `ChatLogisticsService` (+ global module, port, mapping), `ChatParcelMembershipService`, `ChatStaffInterventionService`, `GET /chat/conversations/unread-summary`. Changed: `ChatConversationService` (get-or-create guard, reconciliation, parcel context, unread summary), `ChatAdminService` (delegates intervention), `ChatMessageService` (idempotent workflow system message), `ChatEventsService` (workflow events), eligibility policy (`isParcelRecipient`), `OutboxRelayService` (new target). `POST /chat/conversations` accepts optional `reason` for `PARCEL_DELIVERY` / `MERCHANT_DESK`.

## 5. Contracts and events

`ChatParcelContext`, `ChatConversationSummary.parcel`, `ChatUnreadSummary`, `CHAT_UNREAD_SUMMARY_CAP`, `CHAT_LOGISTICS_EVENT_KEYS`, optional `reason` on two create variants. **No new domain event types**; existing `parcel.*.v1` events gained one fan-out target; chat events reused (`participant_added/removed`, `message_created`).

## 6. Authorization matrix

See `PHASE-5-AUTHORIZATION-MATRIX.md`. Summary: access = ACTIVE row ∧ live eligibility (unchanged); rows now converge to eligibility; ADMIN joins existing threads only with reason + permission + audit; customers by exact phone; all negative cases tested (cross-tenant, other hub, unassigned/reassigned rider REST + socket, different-format phone, admin without reason, merchant vs internal notes, moderator-removed user).

## 7. Participant lifecycle

Workflow removal = `REMOVED` + audit (`actor_user_id` NULL, `metadata.workflow`, `reason: "ineligible"`, `sourceEventId`) + realtime revocation. Re-admission only if the latest removal was a workflow removal and the user is eligible. Inactive accounts are skipped. Reconciliation runs on each lifecycle event and on every get-or-create of an existing parcel thread. Full policy: `PHASE-5-LIFECYCLE-POLICY.md`.

## 8. System-message mapping

| Event                        | `eventKey`                                                               | Params                                                                   |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `parcel.assigned.v1`         | `parcel.rider_assigned` / `parcel.rider_reassigned` (`reassigned: true`) | `trackingCode`                                                           |
| `parcel.out_for_delivery.v1` | `parcel.out_for_delivery`                                                | `trackingCode`                                                           |
| `parcel.delivered.v1`        | `parcel.delivered`                                                       | `trackingCode`                                                           |
| `parcel.failed.v1`           | `parcel.delivery_failed`                                                 | `trackingCode`, `reason` (enum only), `rescheduledFor` (valid date only) |
| `parcel.returned.v1`         | `parcel.returned`                                                        | `trackingCode`                                                           |

Never: names, phones, addresses, COD, ids, free text. Posted only to existing, non-archived threads; deduplicated by source event id.

## 9. Test results

Contracts 58/58; API unit 208/208; API chat integration 108 passed + 1 conditional skip (17 new logistics tests); web 230/230 (14 new); web typecheck/lint/build pass; API changed-file lint clean (whole-app lint: 1 pre-existing error at `main.ts:90`). Not executed: Playwright E2E, `notifications-webhooks.e2e-spec.ts`. Details: `PHASE-5-TEST-REPORT.md`.

## 10. Known limitations

1. **No browser E2E** for the new entry points (component tests only).
2. **No system notices or event-driven reconciliation for cancellation, hub receive/transfer or recipient-phone edits** — those workflows publish no domain event. Access is still denied live at once; rows converge on the next lifecycle event or thread open; sockets within 60 s (Phase 3 revalidation). Adding `parcel.cancelled.v1` / hub events is a follow-up touching webhook contracts.
3. **No per-message notification-centre/push/SMS/email notifications** for chat — the notification system has no chat category or preference, and per-message rows would spam the centre. Incoming messages surface via the global unread badge (60 s poll outside the messenger, instant inside it).
4. **System notices may be out of order** if one parcel event is retried after a later one (each is idempotent; membership is state-based and always converges).
5. Hub managers return to the hub parcel lookup (no hub parcel detail page exists).
6. DIRECT conversations still show the type label in the list (counterpart names are not in the summary); parcel threads now show the tracking code.
7. Auto-closing threads after delivery/return is intentionally **not** implemented (no business rule); staff use existing lifecycle endpoints.

## 11. Phase 1–4 integrity

Migrations 0010/0011 were not applied to any shared or development database; no new migration; `delivery_otp_code` drift untouched (test-only shim in the throwaway DB). Phase 1–3 suites pass (91/91 + 1 skip as before) and Phase 4 web tests pass (216 + 14 new). Two Phase 2 test adjustments follow the approved behaviour changes (`PHASE-5-TEST-REPORT.md` §3). Non-chat parcel/rider/hub services were not modified. No commits; no `git add` was run by me — files appear staged because an external auto-staging tool stages changes in this workspace (also observed in Phase 4).

## 12. Can Phase 6 begin?

**Yes.** Uploads (Phase 6) build on the unchanged message/attachment model. Carry-overs: Playwright run on an isolated stack with chat migrations; optional domain events for cancellation and hub transfer; a chat notification category decision before Phase 7/8.
