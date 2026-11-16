# Communication Platform — Phase 6 Attachment Lifecycle

## 1. States (existing enum, no migration)

| State           | Meaning                                                                                                         | Usable in a message                              | Downloadable                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `PENDING`       | Slot reserved, presigned PUT issued; bytes not yet verified                                                     | No                                               | No                                                                                    |
| `UPLOADED`      | Server verified the stored object: exact size, SHA-256, file signature                                          | Yes (once, by its uploader, in its conversation) | Linked to a non-deleted message: current eligible participants. Unsent: uploader only |
| `REJECTED`      | Verification failed (size / checksum / signature); object deleted after commit; `ATTACHMENT_REJECTED` audit row | No                                               | No                                                                                    |
| _(row deleted)_ | Cancelled by the uploader before sending, or removed by cleanup (expired / unsent / rejected retention)         | —                                                | —                                                                                     |

"Uploading", "verifying" and "failed" exist only as composer UI states; the server never stores them.

## 2. Transitions

```
reserve ──► PENDING ──complete (verified)──► UPLOADED ──send──► UPLOADED + message_id
               │                                 │
               ├─complete (mismatch)──► REJECTED ─┴─(retention)──► row purged
               ├─cancel (uploader) ───► row + object deleted
               └─TTL expired ─────────► row + object deleted (cleanup)
UPLOADED, unsent ──cancel / unsent TTL──► row + object deleted
```

- Only `PENDING → UPLOADED` and `PENDING → REJECTED` are status changes; both are conditional updates (`WHERE status = 'PENDING'`), so concurrent completions are safe and idempotent: repeating `complete` on `UPLOADED` returns it unchanged; on `REJECTED` it stays rejected.
- Linking happens only inside the message send transaction (`ChatMessageService.assertAttachments`, row lock `FOR UPDATE`): `UPLOADED`, same conversation, same uploader, `message_id IS NULL`, type-compatible (IMAGE ⇒ images, VOICE ⇒ exactly one audio). A failed send rolls back the link. A retried send with the same `clientMessageId` returns the original message before attachments are re-checked, so no double link.
- Rows with `message_id` set are never deleted or changed by this lifecycle.

## 3. Completion verification

1. Caller must be the uploader and still an eligible participant with `SEND_MESSAGE` (else 404).
2. Expired reservation (`createdAt` + pending TTL) → 422.
3. `HEAD` missing → 422 "not uploaded yet" (stays `PENDING`, client may finish the PUT and retry).
4. `HEAD` size ≠ declared or > type limit → REJECTED (`size`).
5. Stream the object once (stops past the type limit): byte count, SHA-256, first 16 bytes.
6. Size ≠ declared → `size`; signature ≠ declared type → `signature`; hash ≠ declared → `checksum` → REJECTED.
7. Otherwise `UPLOADED` + `uploaded_at`.

## 4. Deletion and retention

| Situation                                         | Object                                                            | Row                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Uploader cancels unsent attachment                | Deleted after the row delete commits                              | Deleted                                                                        |
| Message deleted by sender or removed by moderator | **Retained** (ADR-019 moderation retention); downloads return 404 | Kept, linked                                                                   |
| Rejected                                          | Deleted right after rejection (retried by cleanup)                | Purged after `CHAT_REJECTED_ATTACHMENT_RETENTION_SECONDS` (7 days)             |
| Expired `PENDING`                                 | Deleted by cleanup                                                | Deleted after `CHAT_PENDING_UPLOAD_TTL_SECONDS` (1 h; always ≥ 2× PUT URL TTL) |
| `UPLOADED` never sent                             | Deleted by cleanup                                                | Deleted after `CHAT_UNSENT_ATTACHMENT_TTL_SECONDS` (24 h)                      |
| Object without a row (orphan)                     | Deleted by the sweep when older than the pending TTL              | —                                                                              |

Order is always **claim the row (committed delete) → delete the object**. A concurrent send either links first (the delete matches nothing) or finds the row gone; an object-delete failure leaves an orphan for the sweep. Retention of attachments of deleted messages beyond moderation needs is a Phase 7 policy decision (not purged in Phase 6).

## 5. Cleanup job

`ChatAttachmentCleanupService.runOnce()` — expired pending, unsent, rejected, then one page of the orphan sweep; bounded by `CHAT_ATTACHMENT_CLEANUP_BATCH` (100) per category; `FOR UPDATE SKIP LOCKED` so concurrent runs never contend. Scheduled through the existing BullMQ/Redis as a single cluster-wide job scheduler (`chat-attachment-cleanup`, every `CHAT_ATTACHMENT_CLEANUP_INTERVAL_MS`, default 10 min); registration retries while Redis connects. Each non-empty run logs `chat.attachment.cleanup …` counts.
