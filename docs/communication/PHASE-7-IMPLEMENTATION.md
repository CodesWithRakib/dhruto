# Communication Platform — Phase 7 Implementation

Scope: Admin Communication Center as an extension of the existing messenger. Audit: `PHASE-7-AUDIT.md`.

## 1. Contracts (`packages/contracts/src/chat/`)

| File                          | Change                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chat.enums.ts`               | 9 audit actions; 4 permissions (`ESCALATION_MANAGE`, `ATTACHMENT_RESTRICTED_ACCESS`, `ATTACHMENT_QUARANTINE_MANAGE`, `RETENTION_MANAGE`); `CHAT_GRANT_REQUIRED_PERMISSIONS`; `ChatEscalationStatus`; `ChatAttachmentScanStatus` |
| `chat.policy.ts`              | `CHAT_ESCALATION_TRANSITIONS`, `canTransitionEscalation`, `escalationNoteRequired`, `CHAT_ESCALATION_ACTIVE_STATUSES`, `chatAttachmentServeDecision`                                                                            |
| `chat-admin-center.schema.ts` | Inbox query/response, metrics, staff profile, escalation request/response, attachment queue/decision, admin attachment item, retention status                                                                                   |
| `chat-admin.schema.ts`        | Report query `conversationId`; report review requires note for terminal decisions; audit query `action`                                                                                                                         |
| `chat.schema.ts`              | `ChatAttachmentItem.scanStatus`                                                                                                                                                                                                 |
| `common/api-error.schema.ts`  | `CHAT_ATTACHMENT_SCAN_PENDING`, `CHAT_ATTACHMENT_BLOCKED`, `CHAT_ESCALATION_INVALID`                                                                                                                                            |

## 2. Database (migration `1700000000012-CommunicationPhase7AdminCenter.ts`)

Additive and idempotent. Enum values; `chat_conversations` escalation columns (+2 FKs, 2 CHECKs, 2 partial indexes, expression index `IDX_chat_conversations_activity` declared `synchronize: false` on the entity); `chat_attachments` scan/retention columns (+3 CHECKs incl. checksum binding, 3 indexes); `IDX_chat_reports_conversation_status`; new table `chat_staff_grants` (unique active grant per user+permission, permission CHECK, reason CHECK, revocation CHECK). Entities updated with zero drift (verified by the foundation drift test). `down` verified (reverts and re-applies). Entity: `ChatStaffGrant`.

## 3. Backend (`apps/api/src/chat/`)

| Area                    | Files                                                                                                                                                                                                 | Notes                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grant-aware permissions | `policies/chat-eligibility.policy.ts` (`actorHoldsChatPermission`, `staffHasPermission`), `services/chat-authorization.service.ts` (`loadActorScopeById`, `loadActiveGrants`, `requirePlatformStaff`) | Role ceiling file unchanged; grants loaded per request for staff roles only                                                                        |
| Inbox / metrics / me    | `services/chat-admin-inbox.service.ts`, `chat-admin-center.controller.ts`                                                                                                                             | Raw SQL with bound parameters only; keyset on activity; content only for participants                                                              |
| Escalation              | `services/chat-escalation.service.ts`                                                                                                                                                                 | Row lock, transition table, audit history, idempotent, notifies new assignee via existing `NotificationsService` (optional injection)              |
| Existing admin service  | `services/chat-admin.service.ts`                                                                                                                                                                      | Note reads audited; report UNDER_REVIEW audited + idempotent repeats; report conversation filter; audit action filter; uses `requirePlatformStaff` |
| Send path               | `services/chat-message.service.ts`                                                                                                                                                                    | Rejects already INFECTED/FAILED attachments                                                                                                        |
| Malware scan            | `attachments/malware-scanner.port.ts`, `clamav-scanner.ts`, `chat-attachment-scan.service.ts`, `chat-attachment-scan.scheduler.ts`                                                                    | ClamAV INSTREAM adapter; BullMQ job scheduler; lease-based claims; checksum binding; backoff; fail closed                                          |
| Download gate           | `attachments/chat-attachment.service.ts`                                                                                                                                                              | `chatAttachmentServeDecision` after authorization                                                                                                  |
| Staff attachments       | `attachments/chat-attachment-admin.service.ts`, `chat-admin-attachments.controller.ts`                                                                                                                | Conversation metadata, queue, restricted download, release/rescan, retention status                                                                |
| Retention               | `attachments/chat-attachment-cleanup.service.ts`                                                                                                                                                      | Two new categories (deleted-message objects, quarantined objects), evidence hold, claim→delete with rollback                                       |
| Grants CLI              | `staff-grants/chat-staff-grants.ts`, `chat-staff-grants-cli.ts`, script `chat:grants`                                                                                                                 | Operator-only; audited                                                                                                                             |
| Errors / mapper         | `chat.errors.ts`, `chat.mapper.ts`                                                                                                                                                                    | New factories; `scanStatus` mapped                                                                                                                 |
| Log hygiene             | `common/interceptors/redact-url.ts`, `logging.interceptor.ts`                                                                                                                                         | Redacts `reason`, `q` and credential-like query values from HTTP access logs (found during E2E log audit)                                          |

Configuration (all optional): `CHAT_CLAMAV_HOST`, `CHAT_CLAMAV_PORT`, `CHAT_CLAMAV_TIMEOUT_MS`, `CHAT_MALWARE_SCAN_ENABLED`, `CHAT_MALWARE_SCAN_INTERVAL_MS`, `CHAT_MALWARE_SCAN_BATCH`, `CHAT_MALWARE_SCAN_MAX_ATTEMPTS`, `CHAT_MALWARE_SCAN_LEASE_SECONDS`, `CHAT_MALWARE_SCAN_RETRY_BASE_SECONDS`, `CHAT_DELETED_MESSAGE_ATTACHMENT_RETENTION_SECONDS`, `CHAT_QUARANTINED_ATTACHMENT_RETENTION_SECONDS`.

## 4. Frontend (`apps/web-merchant/`)

- New feature `features/chat-admin/` (API slice, helpers, center shell, overview, inbox/escalation queue, reports, attachment security, audit, workspace with history/escalation/notes cards, reason dialog). Routes `app/[locale]/(admin)/admin/communications/` and `[conversationId]/`. Navigation entry + routes. `ChatAdmin` namespace in en/bn.
- Messenger: `features/chat/components/attachment-security-gate.tsx` wraps attachments; error keys for the new codes.
- Details: `PHASE-7-ADMIN-UX.md`.

## 5. Realtime and outbox

No new events and no socket changes. Escalation, notes, grants, scan results and audit are staff-only and never enter the outbox, so participant fan-out cannot carry them. Staff queues refresh via RTK Query invalidation, focus and polling (metrics 60 s).

## 6. Decisions and trade-offs

1. **Grant table instead of a new role.** No SUPERADMIN; existing ADMIN behavior unchanged except for three new, explicitly grant-gated permissions. Narrowing other ADMIN permissions to grants is a product decision (documented, not done).
2. **CLI-only grants.** Prevents self-escalation through the app; operational friction accepted.
3. **Escalation as columns + audit history.** One current state per conversation is what the queue needs; the immutable audit log already provides history.
4. **Exact-identifier search only.** Staff full-text search over all conversations would be a platform-wide content read; it was not added.
5. **Read-only investigation view + existing messenger for sending.** Avoids a second sending/timeline implementation.
6. **Send allowed while scanning.** Keeps the composer flow unchanged; content is withheld from everyone until clean.
7. **Retention disabled by default** for linked attachments: legal periods are not ours to invent.
