# Communication Platform — Phase 6 API Reference

Base path `/api/v1`, bearer JWT, platform envelope `{ success, data }`, errors `{ errorCode }`. No implicit ADMIN access: staff reach attachments only as participants (after an audited intervention).

## Upload policy (`CHAT_UPLOAD_POLICY`, shared contract)

| MIME              | Extensions     | Max size |
| ----------------- | -------------- | -------- |
| `image/jpeg`      | jpg, jpeg      | 10 MiB   |
| `image/png`       | png            | 10 MiB   |
| `image/webp`      | webp           | 10 MiB   |
| `application/pdf` | pdf            | 20 MiB   |
| `audio/webm`      | webm, weba     | 10 MiB   |
| `audio/ogg`       | ogg, oga, opus | 10 MiB   |
| `audio/mpeg`      | mp3            | 10 MiB   |
| `audio/mp4`       | m4a, mp4       | 10 MiB   |

Max 10 attachments per message; voice ≤ 5 min (`CHAT_VOICE_MAX_DURATION_MS`); max 20 unfinished uploads per user (`CHAT_MAX_PENDING_UPLOADS_PER_USER`). SVG, HTML, archives, executables and anything unlisted are rejected.

## Endpoints

### `POST /chat/conversations/:id/attachments` — reserve (rate limit `chat-upload`, 30/min)

Body (`createChatAttachmentSchema`): `originalFilename` (≤255, no `/` `\` or control chars, extension must match type), `mimeType`, `sizeBytes`, `checksumSha256` (lowercase hex).
Requires ACTIVE eligible participant with `SEND_MESSAGE`; conversation writable.
**201** `ChatAttachmentUploadTicket`:

```json
{
  "attachment": {
    "id": "…",
    "originalFilename": "photo.png",
    "mimeType": "image/png",
    "kind": "image",
    "sizeBytes": 20,
    "status": "PENDING",
    "uploadedAt": null
  },
  "upload": {
    "method": "PUT",
    "url": "<presigned, 5 min>",
    "headers": { "Content-Type": "image/png" },
    "expiresAt": "…"
  }
}
```

Errors: 404 `CHAT_CONVERSATION_NOT_FOUND` (not a member / ineligible), 403 `CHAT_FORBIDDEN`, 409 `CHAT_CONVERSATION_NOT_WRITABLE`, 422 `VALIDATION_ERROR` / `CHAT_ATTACHMENT_INVALID`, 422 `CHAT_LIMIT_EXCEEDED`, 503 `CHAT_STORAGE_UNAVAILABLE`.

The client then `PUT`s the bytes to `upload.url` with exactly `upload.headers`.

### `POST /chat/attachments/:id/complete` — verify (rate limit `chat-upload`)

Uploader only. **200** `ChatAttachmentItem` with `status: "UPLOADED"`. Idempotent.
Errors: 404 `CHAT_ATTACHMENT_NOT_FOUND` (unknown or not yours), 422 `CHAT_ATTACHMENT_INVALID` (not uploaded yet — retryable; expired; rejected: content/size/checksum mismatch), 503.

### `DELETE /chat/attachments/:id` — cancel unsent (rate limit `chat-upload`)

Uploader only, `message_id` must be null. **200** `{ id, deleted: true }`. 404 for others; 422 when already sent (delete the message instead).

### `GET /chat/attachments/:id/download[?download=true]` — authorized URL (rate limit `chat-download`, 240/min)

**200** `ChatAttachmentDownload` `{ url, expiresAt, disposition }` — presigned GET, 5 min, `Content-Type` = verified type, `Content-Disposition` inline for images/audio and attachment for PDFs (`?download=true` forces attachment), RFC 6266 filename encoding.
Allowed: current eligible participants for attachments of non-deleted messages; the uploader for their own unsent `UPLOADED` attachment. Everything else (pending, rejected, deleted message, other tenant, removed/reassigned participant, unknown id) → **404 `CHAT_ATTACHMENT_NOT_FOUND`**. 401 without a token.

### Messages (existing, Phase 2)

`POST /chat/conversations/:id/messages` with `type: IMAGE | FILE` (`attachmentIds` 1–10, optional `content`) or `VOICE` (`attachmentIds` exactly 1, `metadata.durationMs`). History and realtime `message:new` carry `attachments: ChatAttachmentItem[]` (metadata only: no keys, no URLs).
