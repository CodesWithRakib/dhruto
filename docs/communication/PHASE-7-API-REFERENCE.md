# Communication Platform — Phase 7 API Reference

Base: `/api/v1`. Envelope `{ success, data }`; errors `{ success:false, errorCode, message }`. Validation: strict zod contracts (`@dhruto/contracts`, `chat-admin-center.schema.ts`), unknown keys → 422 `VALIDATION_ERROR`. All routes: bearer auth, `chat-admin` rate limit (120/min/user, `CHAT_RATE_LIMIT_ADMIN_PER_MIN`; downloads use `chat-download`). Swagger tag: **Chat Admin**. Authorization: `PHASE-7-AUTHORIZATION-MATRIX.md`.

## New endpoints

### `GET /chat/admin/me`

Effective staff permissions → `ChatStaffProfile { userId, role, permissions[], hubIds[] }`.

### `GET /chat/admin/inbox`

Query (all optional): `type`, `status`, `merchantId`, `hubId` (conversation hub **or** parcel's current hub), `parcelId`, `riderId` (parcel's current rider), `parcelStatus`, `participantUserId`, `escalation` (`OPEN|IN_REVIEW|ESCALATED|RESOLVED|CLOSED|ACTIVE|NONE`), `hasOpenReports` (`true|false`), `assignedToMe`, `from`/`to` (ISO, last activity), `q` (≤ 64; exact conversation id, report id, or tracking code — case-insensitive), `cursor`, `limit` (1–50, default 25).
→ `ChatInboxPage { items: ChatInboxItem[], nextCursor, hasMore }`, ordered by last activity desc (keyset on `(COALESCE(last_message_at, createdAt), id)`). `ChatInboxItem`: id, type, title, status, parcel `{id, trackingCode, status}`, hubId/hubName, merchantId/merchantName, lastActivityAt, lastMessageSequence, activeParticipantCount, isParticipant, lastMessagePreview & unreadCount (**only when the caller is an ACTIVE participant**, else null), openReportCount, escalation `{status, assigneeUserId, assigneeName, updatedAt}`, createdAt. 422 `CHAT_CURSOR_INVALID` for bad cursors.

### `GET /chat/admin/metrics`

→ `ChatAdminMetrics`: conversations `{total, active, byType}`, myUnreadConversations, escalations `{open, inReview, escalated, assignedToMe}`, reports `{open, underReview}`, needsAttention, interventionsLast7Days, attachments `{scanPending, blocked}`, conversationVolume (14 UTC days).

### `GET /chat/admin/conversations/:id/escalation`

→ `ChatEscalationDetail { current: ChatEscalationState, history: ChatEscalationHistoryItem[] (≤ 100, newest first) }`.

### `PUT /chat/admin/conversations/:id/escalation`

Body `{ status, note?, assigneeUserId?: uuid | null }`. Note 10–1000 chars, required unless `status = IN_REVIEW`. → `ChatEscalationDetail`. Errors: 404 (not permitted / unknown), 409 `CHAT_ESCALATION_INVALID` (transition, bad assignee), 422 `CHAT_REASON_REQUIRED`. Idempotent.

### `GET /chat/admin/conversations/:id/attachments?reason=`

→ `ChatAdminAttachmentItem[]` (≤ 200, newest first): ids, filename, MIME, kind, size, status, scanStatus, scanAttempts, scannedAt, scanEngine, scanThreat, scanError, quarantinedAt, objectPurgedAt, messageDeleted, createdAt. Never a storage key.

### `GET /chat/admin/attachments?scanStatus=&cursor=&limit=`

Quarantine/scan queue. Default: `INFECTED` + `FAILED`. → `ChatAdminAttachmentPage`. 403 without the grant.

### `GET /chat/admin/attachments/:attachmentId/download?reason=`

→ `ChatAttachmentDownload { url, expiresAt, disposition: "attachment" }` (presigned GET, 5 min). Works for any scan state if the object exists; non-clean content is served as `application/octet-stream`. 404 when not permitted, not verified, or purged; 503 `CHAT_STORAGE_UNAVAILABLE`.

### `POST /chat/admin/attachments/:attachmentId/decision`

Body `{ action: "RELEASE" | "RESCAN", reason }`. → `ChatAdminAttachmentItem`. 422 for: releasing a PENDING file, releasing integrity failures (`checksum_mismatch`, `object_missing`), rescanning a CLEAN file, purged/unverified rows. Idempotent (release of CLEAN / rescan of an untouched PENDING return the item).

### `GET /chat/admin/retention`

→ `ChatRetentionStatus { scannerConfigured, scannerEngine, policies[{category, retentionSeconds|null, eligibleCount|null}], evidenceHold }`.

## Changed endpoints (backward compatible except where noted)

| Endpoint                                              | Change                                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /chat/admin/reports`                             | New optional `conversationId` filter                                                                                                                          |
| `POST /chat/admin/reports/:id/review`                 | **Breaking:** `resolutionNote` required for `RESOLVED`/`DISMISSED` (422 otherwise). Repeating the recorded status returns it unchanged. UNDER_REVIEW audited. |
| `GET /chat/admin/audit-logs`                          | New optional `action` filter                                                                                                                                  |
| `GET /chat/admin/conversations/:id/notes`             | Now audited (`INTERNAL_NOTE_VIEWED`); response unchanged                                                                                                      |
| `GET /chat/attachments/:id/download`                  | **Behavior:** 409 `CHAT_ATTACHMENT_SCAN_PENDING` / `CHAT_ATTACHMENT_BLOCKED` for authorized participants until the scan is CLEAN                              |
| `POST /chat/conversations/:id/messages`               | 422 when an attachment is already INFECTED/FAILED                                                                                                             |
| Attachment items (history, socket payloads, complete) | New field `scanStatus`                                                                                                                                        |

## Error codes (new)

`CHAT_ATTACHMENT_SCAN_PENDING` (409), `CHAT_ATTACHMENT_BLOCKED` (409), `CHAT_ESCALATION_INVALID` (409).

## Operator CLI (not HTTP)

```
pnpm --filter @dhruto/api build
pnpm --filter @dhruto/api chat:grants grant  --user <email|id> --permission chat.attachment.restricted_access --reason "<10-500 chars>" --operator "<label>" [--expires-at <ISO>]
pnpm --filter @dhruto/api chat:grants revoke --user <email|id> --permission <p> --reason "<…>" --operator "<label>"
pnpm --filter @dhruto/api chat:grants list   [--user <email|id>]
```

Uses the API database configuration; prints ids/outcomes only; writes `STAFF_GRANT_CHANGED`.
