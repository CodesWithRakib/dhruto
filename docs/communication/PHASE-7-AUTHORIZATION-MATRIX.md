# Communication Platform — Phase 7 Authorization Matrix

Rule (unchanged): participants act through **ACTIVE membership ∧ live eligibility**; staff act on conversations they are not in only through a **ChatPermission**, scoped and audited, with a reason for every content read. Phase 7 adds **explicit per-user grants** for the most sensitive permissions.

## 1. Effective permission

```
effective(actor, p) = roleCeiling(actor.role) ∋ p
                      ∧ (p ∉ GRANT_REQUIRED ∨ activeGrant(actor, p))
staffHasPermission(actor, p, conversation) = effective(actor, p)
                      ∧ (actor = ADMIN ∨ (actor = HUB_MANAGER ∧ conversationHub ∈ actor.managedHubs))
```

- Role ceiling: `apps/api/src/common/permissions/chat-permissions.ts` (unchanged file; ADMIN ceiling = every `ChatPermission`).
- `GRANT_REQUIRED` = `CHAT_GRANT_REQUIRED_PERMISSIONS` (contracts): `chat.attachment.restricted_access`, `chat.attachment.quarantine_manage`, `chat.retention.manage`.
- Active grant: a `chat_staff_grants` row with `revoked_at IS NULL` and (`expires_at IS NULL` or in the future), loaded from the DB on every request (`ChatAuthorizationService.loadActorScopeById`). Revocation/expiry take effect on the next request.
- Grants are written **only** by the operator CLI (`pnpm --filter @dhruto/api chat:grants grant|revoke|list`), never over HTTP; only ACTIVE `ADMIN` accounts can receive them; every change writes `STAFF_GRANT_CHANGED`.
- Implementation: `actorHoldsChatPermission` / `staffHasPermission` in `chat-eligibility.policy.ts`; `requirePlatformStaff` / `requireStaff` in `chat-authorization.service.ts`.

## 2. Permission → capability

| Permission                                    | Grant?  | ADMIN | HUB_MANAGER (own hubs) | MERCHANT / RIDER / CUSTOMER | Used by                                                               |
| --------------------------------------------- | ------- | ----- | ---------------------- | --------------------------- | --------------------------------------------------------------------- |
| `chat.conversation.view_any`                  | no      | ✓     | —                      | —                           | Inbox, metrics, staff conversation/history view, attachments metadata |
| `chat.conversation.view_restricted`           | no      | ✓     | —                      | —                           | `INTERNAL_SUPERVISOR` conversations on every staff path               |
| `chat.conversation.intervene`                 | no      | ✓     | —                      | —                           | Visible intervention (then staff messages via normal API)             |
| `chat.conversation.moderate`                  | no      | ✓     | ✓                      | —                           | Lifecycle incl. LOCK/UNLOCK (unchanged)                               |
| `chat.message.moderate`                       | no      | ✓     | ✓                      | —                           | Remove message (staff path, reason)                                   |
| `chat.internal_note.manage`                   | no      | ✓     | ✓                      | —                           | Create / read (audited) / delete notes                                |
| `chat.report.review`                          | no      | ✓     | —                      | —                           | Report queue and decisions                                            |
| `chat.audit.view`                             | no      | ✓     | —                      | —                           | Audit history                                                         |
| `chat.conversation.export`                    | no      | ✓     | —                      | —                           | Paged export (unchanged)                                              |
| `chat.participant.manage`                     | no      | ✓     | —                      | —                           | (unchanged)                                                           |
| `chat.escalation.manage` **(new)**            | no      | ✓     | —                      | —                           | Escalate / assign / resolve / close                                   |
| `chat.attachment.restricted_access` **(new)** | **yes** | grant | —                      | —                           | Quarantine queue, staff download of restricted content                |
| `chat.attachment.quarantine_manage` **(new)** | **yes** | grant | —                      | —                           | Release / rescan decisions                                            |
| `chat.retention.manage` **(new)**             | **yes** | grant | —                      | —                           | Retention status                                                      |

Hub managers keep their Phase 1–6 permissions (moderation, notes) bounded to assigned hubs; the admin center's platform-scope endpoints are ADMIN-only.

## 3. Endpoint matrix (Phase 7 endpoints)

| Endpoint                                            | Required                                                     | Reason                      | Audit                                                 | Denial          |
| --------------------------------------------------- | ------------------------------------------------------------ | --------------------------- | ----------------------------------------------------- | --------------- |
| `GET /chat/admin/me`                                | ADMIN or HUB_MANAGER                                         | —                           | —                                                     | 403 other roles |
| `GET /chat/admin/inbox`                             | ADMIN + `view_any` (restricted types need `view_restricted`) | —                           | `ADMIN_CONVERSATIONS_LISTED` (no search text)         | 403             |
| `GET /chat/admin/metrics`                           | ADMIN + `view_any`                                           | —                           | — (aggregates only)                                   | 403             |
| `GET /chat/admin/conversations/:id/escalation`      | ADMIN + `view_any` (+ restricted)                            | —                           | —                                                     | 404             |
| `PUT /chat/admin/conversations/:id/escalation`      | ADMIN + `escalation.manage` (+ restricted)                   | note*                       | `ESCALATION_CHANGED`                                  | 404 / 409 / 422 |
| `GET /chat/admin/conversations/:id/attachments`     | `view_any` (+ restricted)                                    | yes                         | `ADMIN_CONVERSATION_VIEWED` (scope attachments)       | 404             |
| `GET /chat/admin/attachments`                       | ADMIN + **grant** `restricted_access`                        | —                           | `ATTACHMENT_RESTRICTED_ACCESSED` (queue)              | 403             |
| `GET /chat/admin/attachments/:id/download`          | **grant** `restricted_access` (+ restricted)                 | yes                         | `ATTACHMENT_RESTRICTED_ACCESSED` (before URL issued)  | 404             |
| `POST /chat/admin/attachments/:id/decision`         | **grant** `quarantine_manage` (+ restricted)                 | yes                         | `ATTACHMENT_RELEASED` / `ATTACHMENT_RESCAN_REQUESTED` | 404 / 422       |
| `GET /chat/admin/retention`                         | ADMIN + **grant** `retention.manage`                         | —                           | —                                                     | 403             |
| `GET /chat/admin/conversations/:id/notes` (changed) | `internal_note.manage` (scoped)                              | —                           | **new** `INTERNAL_NOTE_VIEWED`                        | 404             |
| `POST /chat/admin/reports/:id/review` (changed)     | ADMIN + `report.review`                                      | note for RESOLVED/DISMISSED | **new** `REPORT_REVIEW_STARTED`; `REPORT_RESOLVED`    | 403 / 409 / 422 |

\* Escalation note is required for every change except taking a case into review.

Conversation-scoped denials are 404 (no existence leak); platform-scope denials are 403 (no resource probed).

## 4. Participant paths affected by Phase 7

| Path                                     | Change                                                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /chat/attachments/:id/download`     | After the unchanged membership/eligibility checks: scan `PENDING` → 409 `CHAT_ATTACHMENT_SCAN_PENDING`; `INFECTED`/`FAILED` → 409 `CHAT_ATTACHMENT_BLOCKED`; purged → 404. Non-members still get 404 (gate runs only after authorization). |
| `POST /chat/conversations/:id/messages`  | Attachments already `INFECTED`/`FAILED` cannot be sent (422). Pending ones can.                                                                                                                                                            |
| Every participant read / socket / search | Unchanged. Escalation state, notes and staff audit data are never included.                                                                                                                                                                |

## 5. Negative tests

See `PHASE-7-TEST-REPORT.md` §2: merchant → other merchant (404), unassigned rider (404), other-hub manager (404), customer/merchant → notes (403) and note token absent from REST/search/export/outbox/socket, ordinary admin → restricted attachment (404/403), reason-less staff read/intervention (422), pending/infected/failed/tampered files via ordinary routes (409), outsider → pending file (404), inbox exact-match search (no partial/injection hits), grants for non-admins rejected, expired/revoked grants ineffective.
