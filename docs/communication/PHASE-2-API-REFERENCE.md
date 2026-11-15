# Communication Platform — Phase 2 API Reference

Base path: `/api/v1`. Every route requires `Authorization: Bearer <access token>`. Responses use the platform envelope `{ success, statusCode, message, data, ... }`. Request and response types come from `@dhruto/contracts` (`packages/contracts/src/chat/`).

## Conventions

- **Identity** is always the authenticated user. Bodies are strict: unknown keys such as `senderId`, `sequence` or `role` on create are rejected with `422 VALIDATION_ERROR`.
- **Sequences** are BIGINT values carried as decimal strings (`"5000"`).
- **Enumeration safety:** a conversation or message you cannot access returns `404`, exactly as if it did not exist. `403` appears only inside a conversation you can see but whose action your role does not permit.
- **Staff reasons:** wherever a `reason` is required, it must be 10–500 characters. It is stored in `chat_audit_logs`.
- **Rate limits** are per user, per 60-second window, and configurable through env vars (see `PHASE-2-IMPLEMENTATION.md` §7). Exceeding one returns `429 RATE_LIMIT_EXCEEDED`.

### Error codes (`errorCode`)

| Code                                                     | HTTP | Meaning                                                                  |
| -------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| `CHAT_CONVERSATION_NOT_FOUND` / `CHAT_MESSAGE_NOT_FOUND` | 404  | Missing or not accessible                                                |
| `CHAT_FORBIDDEN`                                         | 403  | Visible conversation, but your participant role disallows the action     |
| `CHAT_PERMISSION_DENIED`                                 | 403  | Missing staff permission or creator role                                 |
| `CHAT_CONVERSATION_NOT_WRITABLE`                         | 409  | Conversation is ARCHIVED, CLOSED or LOCKED                               |
| `CHAT_INVALID_TRANSITION`                                | 409  | Lifecycle transition not allowed                                         |
| `CHAT_SCOPE_INVALID`                                     | 422  | Parcel, hub or merchant is missing or not yours (same response for both) |
| `CHAT_PARTICIPANT_INELIGIBLE` / `CHAT_PARTICIPANT_LIMIT` | 422  | Target user cannot join / 50-member cap reached                          |
| `CHAT_INVALID_SEQUENCE`                                  | 422  | Cursor is beyond the conversation head                                   |
| `CHAT_MESSAGE_NOT_EDITABLE` / `CHAT_EDIT_WINDOW_EXPIRED` | 422  | Edit rules                                                               |
| `CHAT_REPLY_INVALID` / `CHAT_ATTACHMENT_INVALID`         | 422  | Reply target or attachment fails the invariants                          |
| `CHAT_DUPLICATE_REPORT`                                  | 409  | Already reported by you                                                  |
| `CHAT_REASON_REQUIRED`                                   | 422  | Staff path used without a reason                                         |
| `CHAT_CURSOR_INVALID`                                    | 422  | Malformed list cursor                                                    |

## Conversations — `/chat/conversations`

| Method & path                                         | Who                                                            | Body / query                                                             | Result                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `POST /chat/conversations`                            | See the creation rules below                                   | `createChatConversationSchema` (discriminated by `type`)                 | `201` created, or `200` existing (idempotent types) → `ChatConversationDetail` |
| `GET /chat/conversations`                             | Any user (own conversations only)                              | `type?`, `status?`, `unreadOnly?`, `cursor?`, `limit` (1–50, default 20) | `ChatConversationPage`                                                         |
| `GET /chat/conversations/:id`                         | Active, eligible member                                        | —                                                                        | `ChatConversationDetail`                                                       |
| `PATCH /chat/conversations/:id`                       | OWNER/MODERATOR, writable, not DIRECT                          | `{ title }`                                                              | `ChatConversationDetail`                                                       |
| `POST /chat/conversations/:id/archive`                | OWNER/MODERATOR, or staff `CONVERSATION_MODERATE` + reason     | `{ reason? }`                                                            | `{ id, status }`                                                               |
| `POST /chat/conversations/:id/close`                  | Same as archive                                                | `{ reason? }`                                                            | `{ id, status }`                                                               |
| `POST /chat/conversations/:id/reopen`                 | Same as archive (not from LOCKED)                              | `{ reason? }`                                                            | `{ id, status }`                                                               |
| `POST /chat/conversations/:id/lock`                   | Staff `CONVERSATION_MODERATE` (hub-scoped for HM) **+ reason** | `{ reason }`                                                             | `{ id, status }`                                                               |
| `POST /chat/conversations/:id/unlock`                 | Same as lock                                                   | `{ reason }`                                                             | `{ id, status }`                                                               |
| `GET /chat/conversations/:id/participants`            | Member                                                         | —                                                                        | `ChatParticipantItem[]` (no phone/email)                                       |
| `POST /chat/conversations/:id/participants`           | OWNER/MODERATOR, or staff `PARTICIPANT_MANAGE` + reason        | `{ userId, role?: MEMBER\|OBSERVER\|MODERATOR, reason? }`                | `ChatParticipantItem[]`                                                        |
| `DELETE /chat/conversations/:id/participants/:userId` | Self (leave), OWNER/MODERATOR, or staff + reason               | `{ reason? }`                                                            | `{ userId, status }`                                                           |

### Creation rules

| `type`                | Creator roles                                      | Required fields                         | Idempotent         | Participants added                                                     |
| --------------------- | -------------------------------------------------- | --------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `PARCEL_DELIVERY`     | Anyone eligible for the parcel                     | `parcelId`                              | Yes, per parcel    | Owning merchant, current rider, registered recipient customer, creator |
| `MERCHANT_DESK`       | MERCHANT (own desk), ADMIN (`merchantId` required) | — / `merchantId`                        | Yes, per merchant  | Merchant user, creating admin                                          |
| `DIRECT`              | ADMIN, HUB_MANAGER, RIDER                          | `participantUserId`                     | Yes, per user pair | Both users (OWNER)                                                     |
| `SUPPORT_TICKET`      | Any role                                           | `title`, `parcelId?`                    | No                 | Creator                                                                |
| `HUB_OPERATIONS`      | ADMIN, or HUB_MANAGER assigned to the hub          | `hubId`, `title`, `participantUserIds?` | No                 | Creator + eligible listed users                                        |
| `INTERNAL_SUPERVISOR` | ADMIN, HUB_MANAGER                                 | `title`, `participantUserIds`           | No                 | Creator + staff sharing a hub                                          |
| `GROUP`               | ADMIN, HUB_MANAGER, RIDER                          | `title`, `participantUserIds` (1–49)    | No                 | Creator + users sharing a hub                                          |

## Messages

| Method & path                            | Who                                                                   | Body / query                                                       | Result                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `POST /chat/conversations/:id/messages`  | Member with SEND, conversation ACTIVE                                 | `sendChatMessageSchema` (requires `clientMessageId` UUID)          | `201` new, or `200` replay of the same `clientMessageId` → `ChatMessageItem`                       |
| `GET /chat/conversations/:id/messages`   | Member                                                                | `beforeSequence?` \| `afterSequence?`, `limit` (1–100, default 50) | `ChatMessagePage` (chronological, `hasMore`, `nextBeforeSequence`, `nextAfterSequence`, `senders`) |
| `GET /chat/messages/:id`                 | Member                                                                | —                                                                  | `ChatMessageItem`                                                                                  |
| `PATCH /chat/messages/:id`               | Sender only, within the edit window, conversation ACTIVE              | `{ content }`                                                      | `ChatMessageItem`                                                                                  |
| `DELETE /chat/messages/:id`              | Sender only, conversation ACTIVE                                      | —                                                                  | `ChatMessageItem` (soft-deleted, content `null`)                                                   |
| `POST /chat/messages/:id/remove`         | Participant MODERATOR/OWNER, or staff `MESSAGE_MODERATE` (hub-scoped) | `{ reason }`                                                       | `ChatMessageItem`, audited                                                                         |
| `POST /chat/conversations/:id/read`      | Member                                                                | `{ lastReadSequence }`                                             | `ChatCursorState`                                                                                  |
| `POST /chat/conversations/:id/delivered` | Member                                                                | `{ lastDeliveredSequence }`                                        | `ChatCursorState`                                                                                  |

Example: load older history.

```http
GET /api/v1/chat/conversations/7c1e…/messages?beforeSequence=5000&limit=50
```

## Reactions, pins, reports

| Method & path                                    | Who                                       | Body                                              | Result                                   |
| ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| `POST /chat/messages/:id/reactions`              | Member with REACT, conversation ACTIVE    | `{ reaction }` (≤32 chars, no whitespace or `<>`) | `ChatMessageItem` (idempotent)           |
| `DELETE /chat/messages/:id/reactions/:reaction`  | Same                                      | — (URL-encode emoji)                              | `ChatMessageItem`                        |
| `GET /chat/conversations/:id/pins`               | Member                                    | —                                                 | `ChatPinItem[]`                          |
| `POST /chat/conversations/:id/pins`              | OWNER/MODERATOR, conversation ACTIVE      | `{ messageId }`                                   | `ChatPinItem[]` (idempotent, audited)    |
| `DELETE /chat/conversations/:id/pins/:messageId` | OWNER/MODERATOR                           | —                                                 | `ChatPinItem[]` (audited)                |
| `POST /chat/messages/:id/reports`                | Any member except the sender (any status) | `{ reason, details? }`                            | `201 { id, status }`; `409` if duplicate |

## Search

`GET /chat/search?q=<2–100 chars>&conversationId?&from?&to?&limit?` (limit 1–50, default 20) → `ChatSearchResponse`. It covers only conversations where the caller is an active, eligible member, and never internal notes.

## Staff — `/chat/admin/*`

`@Roles(ADMIN, HUB_MANAGER)` is coarse defence only. The decisive checks are the `ChatPermission`s listed below.

| Method & path                                  | Permission                                              | Input                                                                        | Audited as                                                        |
| ---------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `GET /chat/admin/conversations`                | `CONVERSATION_VIEW_ANY` (admin)                         | `type?`, `status?`, `merchantId?`, `hubId?`, `parcelId?`, `cursor?`, `limit` | `ADMIN_CONVERSATIONS_LISTED` (metadata only, no previews)         |
| `GET /chat/admin/conversations/:id`            | `VIEW_ANY` (+`VIEW_RESTRICTED` for INTERNAL_SUPERVISOR) | `?reason=`                                                                   | `ADMIN_CONVERSATION_VIEWED`                                       |
| `GET /chat/admin/conversations/:id/messages`   | Same                                                    | `?reason=` + history params                                                  | `ADMIN_CONVERSATION_VIEWED`                                       |
| `GET /chat/admin/conversations/:id/export`     | `CONVERSATION_EXPORT`                                   | `?reason=`, `afterSequence?`, `limit` (≤1000)                                | `ADMIN_CONVERSATION_EXPORTED`                                     |
| `POST /chat/admin/conversations/:id/intervene` | `CONVERSATION_INTERVENE`                                | `{ reason }`                                                                 | `ADMIN_INTERVENTION` (+ visible SYSTEM_EVENT `chat.staff_joined`) |
| `GET /chat/admin/conversations/:id/notes`      | `INTERNAL_NOTE_MANAGE` (HM: hub-scoped)                 | —                                                                            | —                                                                 |
| `POST /chat/admin/conversations/:id/notes`     | Same                                                    | `{ body }`                                                                   | `INTERNAL_NOTE_CREATED`                                           |
| `DELETE /chat/admin/notes/:noteId`             | Same; author or admin                                   | —                                                                            | `INTERNAL_NOTE_DELETED`                                           |
| `GET /chat/admin/reports`                      | `REPORT_REVIEW` (admin)                                 | `status?`, `cursor?`, `limit`                                                | —                                                                 |
| `POST /chat/admin/reports/:reportId/review`    | `REPORT_REVIEW`                                         | `{ status: UNDER_REVIEW\|RESOLVED\|DISMISSED, resolutionNote? }`             | `REPORT_RESOLVED` (final states)                                  |
| `GET /chat/admin/audit-logs`                   | `AUDIT_VIEW` (admin)                                    | `conversationId?`, `actorUserId?`, `cursor?`, `limit`                        | `AUDIT_LOG_VIEWED`                                                |

Staff actions on the participant routes (lock/unlock, archive/close/reopen, participant management, `messages/:id/remove`) use the same permission and reason rules, and are audited with `metadata.path = "staff"`.
