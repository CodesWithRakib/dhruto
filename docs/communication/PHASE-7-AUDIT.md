# Communication Platform — Phase 7 Audit

Date: 2026-11-16 · Scope: Admin Communication Center. Written **before** any Phase 7 code change, from the code on `main` at `853807f` (clean working tree).

## 1. Existing admin / staff capabilities (verified in code)

| Capability                                 | Where                                                                                         | Notes                                                                                                                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform-wide conversation list (metadata) | `GET /chat/admin/conversations` → `ChatAdminService.listConversations`                        | ADMIN + `CONVERSATION_VIEW_ANY`; filters type/status/merchant/hub/parcel; keyset by `createdAt`; audited `ADMIN_CONVERSATIONS_LISTED`. No previews, no tracking code, no activity ordering, no escalation/report indicators. |
| Staff view of a conversation               | `GET /chat/admin/conversations/:id?reason=`                                                   | Reason mandatory; audited `ADMIN_CONVERSATION_VIEWED`; restricted types need `CONVERSATION_VIEW_RESTRICTED`.                                                                                                                 |
| Staff history read / export                | `GET …/:id/messages?reason=`, `GET …/:id/export?reason=`                                      | Audited per page; export needs `CONVERSATION_EXPORT`. Uses the shared `ChatMessageReaderService.history`.                                                                                                                    |
| Visible intervention                       | `POST …/:id/intervene` → `ChatStaffInterventionService.record`                                | Single writer: MODERATOR membership + `ADMIN_INTERVENTION` audit (DB CHECK on reason) + `chat.staff_joined` system message. Also used by get-or-create (ADR-032).                                                            |
| Participant-visible staff messages         | Normal `POST /chat/conversations/:id/messages` after intervention                             | Staff is then an ordinary MODERATOR participant; existing ordering, idempotency, outbox and realtime apply. UI shows `platformRole` only in the info panel.                                                                  |
| Internal notes                             | `GET/POST …/:id/notes`, `DELETE /chat/admin/notes/:id`                                        | Separate table `chat_internal_notes` (ADR-008); `INTERNAL_NOTE_MANAGE`; creation/deletion audited; **reading is not audited**; no outbox event (good).                                                                       |
| Reports                                    | `GET /chat/admin/reports`, `POST /chat/admin/reports/:id/review`                              | ADMIN + `REPORT_REVIEW`; UNDER_REVIEW/RESOLVED/DISMISSED; resolution note optional (**dismiss without reason possible**); UNDER_REVIEW **not audited**; no conversation filter.                                              |
| Message moderation                         | `POST /chat/messages/:id/remove` (participant moderator or staff `MESSAGE_MODERATE` + reason) | Soft delete; content copied to `chat_message_edits` (ADR-019); audited `MESSAGE_REMOVED_BY_MODERATOR`.                                                                                                                       |
| Conversation lifecycle moderation          | `PATCH /chat/conversations/:id/status`                                                        | LOCK/UNLOCK needs `CONVERSATION_MODERATE` + reason.                                                                                                                                                                          |
| Audit log                                  | `GET /chat/admin/audit-logs`                                                                  | ADMIN + `AUDIT_VIEW`; filters conversation/actor; reading is itself audited; table append-only (trigger).                                                                                                                    |

## 2. Authorization and intervention model

- **Role ceiling** (`common/permissions/chat-permissions.ts`): ADMIN holds every `ChatPermission`; HUB_MANAGER holds moderation + notes, bounded to assigned hubs by `staffHasPermission`; MERCHANT/RIDER/CUSTOMER none.
- **No per-user grants exist.** Every ADMIN account therefore holds every chat permission. This is the main gap against the Phase 7 requirement "ordinary admin cannot access restricted attachments without permission".
- Participant access = ACTIVE membership ∧ live eligibility (ADR-016), loaded from the DB on every request; JWT is identity only.
- Non-holders get 404 on conversation-scoped staff routes (no existence leak); platform routes return 403.
- `@Roles(ADMIN, HUB_MANAGER)` on the admin controller is defence in depth only; the decisive checks are in services.

## 3. Available and missing APIs

Available: listed in §1. Missing for Phase 7:

1. Operational **inbox** with activity ordering, tracking code, escalation and report indicators, search (id / tracking code), parcel-status/rider/date filters.
2. **Metrics** from real data (counts, open escalations/reports, recent interventions, volume per day).
3. **Effective staff permissions** for the caller (permission-aware UI).
4. **Escalation** state, transitions, assignment, history.
5. Report queue filter by conversation; reasons required for terminal decisions; audit of UNDER_REVIEW.
6. **Malware-scan gate** and staff restricted-attachment access (metadata, quarantine queue, release/rescan, audited download).
7. **Retention** status/policy for attachments of deleted messages and quarantined files.
8. Audit filter by action (for the history UI).

## 4. Moderation and audit mechanisms

- `chat_audit_logs`: append-only (UPDATE rejected by trigger), no FKs on targets, reason CHECK for `ADMIN_CONVERSATION_VIEWED`/`ADMIN_INTERVENTION`, written in the same transaction as the action (`ChatAuditService.record(manager, …)`).
- Enum `chat_audit_logs_action_enum` — new actions need `ALTER TYPE … ADD VALUE` (pattern in migration 0011).
- Evidence: soft delete clears content but keeps it in `chat_message_edits`; attachments of deleted messages are retained (download refused).

## 5. Attachment access and security restrictions

- States `PENDING → UPLOADED | REJECTED`; `UPLOADED` = size + SHA-256 + magic bytes verified. **Not malware-scanned** (Phase 6 limitation 1).
- Download: live membership + `UPLOADED` + non-deleted message (or uploader before sending) → 5-minute presigned GET. Everything else 404.
- Staff without membership cannot download at all (Phase 6 limitation 6).
- Cleanup (BullMQ job scheduler `chat-attachment-cleanup`): expired pending, unsent, rejected, orphans; never touches linked rows. Deleted-message attachments retained indefinitely.

## 6. Missing admin UI

The web app (`apps/web-merchant`, Next.js 16 App Router, RTK Query `baseApi`, next-intl en/bn, `@dhruto/ui`) has **no consumer of `/chat/admin/*`**. Admins only have the participant messenger at `/admin/messages` (with the reason dialog for joining parcel threads). Missing: overview, inbox, conversation workspace, escalation queue, report queue, attachment security view, audit history.

## 7. Proposed architecture (extension, not replacement)

- **Backend:** keep `ChatAdminService` and its routes. Add focused services in `apps/api/src/chat/services/`: `ChatAdminInboxService` (inbox, metrics, effective permissions), `ChatEscalationService`. Add `ChatAttachmentScanService` + scanner port + ClamAV (`clamd` INSTREAM) adapter, `ChatAttachmentAdminService` and retention in the existing cleanup service, all inside `ChatAttachmentsModule` on the existing BullMQ/Redis and storage port.
- **Per-user staff grants:** a minimal `chat_staff_grants` table. A small set of _grant-required_ permissions (restricted attachment access, quarantine management, retention management) is effective only when the role ceiling allows it **and** an active grant exists. Existing permissions keep their Phase 1–6 behavior. Grants are created/revoked only by an operator CLI (audited), never by an admin UI — otherwise any admin could grant themselves.
- **Escalation:** current state on `chat_conversations` (nullable columns, no rewrite), history in `chat_audit_logs`. Independent of conversation lifecycle status.
- **Malware gate:** `scan_status` on `chat_attachments` bound to the verified SHA-256; downloads require `CLEAN`; scanner absent/failing ⇒ attachments stay blocked (fail closed).
- **Frontend:** new `/admin/communications` section using RTK Query endpoints injected into `baseApi`, existing `@dhruto/ui` components and `Chat`/new `ChatAdmin` translation namespaces; participant messaging continues in the existing messenger (`/admin/messages/:id`) after intervention.

## 8. Required migration

One additive migration `1700000000012-CommunicationPhase7AdminCenter`: audit enum values; escalation columns + index on `chat_conversations`; scan/retention columns + indexes on `chat_attachments`; report-by-conversation index; activity-ordering index; `chat_staff_grants` table. Tested only on disposable PostgreSQL; migrations 0010/0011 are not applied to shared/dev databases.

## 9. Security risks and boundaries

| Risk                                                  | Boundary                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Blanket admin bypass                                  | No new implicit path; every read of content keeps reason + audit; grant-required permissions for the most sensitive operations. |
| Self-granting privileges                              | Grants only via operator CLI with DB access (audited); no HTTP endpoint writes grants.                                          |
| Internal-note leakage                                 | Separate table, staff-only routes, no outbox events, excluded from search/exports; tested on REST, socket, search.              |
| Inbox leaking content                                 | Inbox returns metadata; last-message preview only where the caller is an ACTIVE participant.                                    |
| Existing un-scanned attachments becoming downloadable | Migration defaults every row to `PENDING` scan status (fail closed); job scans them.                                            |
| Scanner placeholder mistaken for protection           | No "allow" fallback; without a configured scanner attachments remain blocked and the UI says "security check pending".          |
| Logging secrets                                       | Logs/audits carry ids, statuses and counts only; no presigned URLs, keys, tokens or content.                                    |
| Out of scope                                          | AI features, new services, Kafka/K8s, parcel lifecycle changes, SUPERADMIN.                                                     |
