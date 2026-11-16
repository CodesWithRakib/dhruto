# Communication Platform — Phase 6 Implementation

Date: 2026-11-16 · Baseline `5dd84df`. Scope: secure attachments (images, PDF), voice messages, storage lifecycle — on the existing schema, message pipeline, realtime and messenger UI.

## 1. Backend (`apps/api/src/chat/attachments/`, new module `ChatAttachmentsModule`)

| File                                   | Role                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `object-storage.port.ts`               | The single storage abstraction (presign PUT/GET, head, stream, delete, bounded list)                      |
| `s3-object-storage.ts`                 | AWS SDK v3 adapter (S3 / S3-compatible); separate signing endpoint option; RFC 6266 `Content-Disposition` |
| `attachment.config.ts`                 | Storage config + tunables from env; server key format `chat/<conversation>/<attachment>`                  |
| `file-signature.ts`                    | Magic-byte verification per allowed type                                                                  |
| `chat-attachment.service.ts`           | Reserve, complete (stream verify), cancel, download (live authorization)                                  |
| `chat-attachments.controller.ts`       | Thin REST controller, Swagger, rate limits                                                                |
| `chat-attachment-cleanup.service.ts`   | Bounded, idempotent cleanup (expired, unsent, rejected, orphans)                                          |
| `chat-attachment-cleanup.scheduler.ts` | BullMQ job scheduler + worker on the existing Redis                                                       |
| `chat-attachment-metrics.ts`           | Per-instance counters                                                                                     |

Changed: `chat.mapper.ts` (`kind`), `chat.errors.ts` (`attachmentNotFound`, `storageUnavailable`), `chat.config.ts` (upload/download rate limits), `chat.module.ts` (exports `ChatAuditService`), `app.module.ts`. The message send path (Phase 2 `assertAttachments`), history and realtime fan-out were already attachment-aware and needed **no change**.

**No migration**: the Phase 1 `chat_attachments` table and its `PENDING/UPLOADED/REJECTED` states cover the lifecycle (see `PHASE-6-ATTACHMENT-LIFECYCLE.md`).

Dependencies added to `@dhruto/api`: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (no storage integration existed to extend).

## 2. Contracts (`packages/contracts`)

`CHAT_UPLOAD_POLICY` (per-type extensions and size limits), `ChatAttachmentKind`, `checkChatUploadPolicy`, `isChatAttachmentMimeType`, `chatAttachmentKind`, `chatFileExtension`, `CHAT_VOICE_MAX_DURATION_MS`, `ChatAttachmentUploadTicket`, `ChatAttachmentDownload`, `ChatAttachmentItem.kind`; the reservation schema now enforces the policy; error codes `CHAT_ATTACHMENT_NOT_FOUND`, `CHAT_STORAGE_UNAVAILABLE`.

## 3. Frontend (`apps/web-merchant/features/chat/`)

| File                                                                       | Role                                                                                                                                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/chat.api.ts`                                                          | `reserveAttachment`, `completeAttachment`, `cancelAttachment`, `getAttachmentDownload` (cached ≤120 s), `getAttachmentFile` (forced download, uncached) |
| `lib/upload.ts`                                                            | Policy check, MIME normalization, SHA-256, XHR PUT with progress/abort, size formatting                                                                 |
| `hooks/use-attachment-uploads.ts`                                          | Composer attachment state: hash → reserve → PUT → complete; retry (fresh slot), remove (abort + cancel), send-blocking flags                            |
| `hooks/use-voice-recorder.ts`                                              | MediaRecorder; mic requested only on explicit start; tracks released; 5-min cap                                                                         |
| `hooks/use-send-message.ts`                                                | Media messages through the existing optimistic pipeline; same `clientMessageId` and payload on retry                                                    |
| `state/chat-timeline.slice.ts`                                             | Optimistic entries/outbox carry type, attachments, voice metadata (text entries unchanged)                                                              |
| `components/message-composer.tsx`                                          | Attach button (accept list from the policy), chips, send blocked until all uploads verified, caption, voice                                             |
| `components/composer-attachments.tsx`                                      | Draft chips: progress bar, verifying, failure + retry, remove                                                                                           |
| `components/voice-recorder-bar.tsx`                                        | Record / cancel / stop-and-send, upload, retry/discard, unsupported/denied states                                                                       |
| `components/message-attachments.tsx`                                       | Image grid + lightbox, document card + download, voice player; URL refetch on expiry                                                                    |
| `components/message-bubble.tsx`, `conversation-panel.tsx`, `lib/errors.ts` | Integration, error keys                                                                                                                                 |
| `messages/en.json`, `bn.json`                                              | `Chat.attachments.*`, `Chat.voice.*`, 4 error keys (additive)                                                                                           |

No new socket, state library or UI library. Realtime and reconnect recovery are unchanged: events carry attachment metadata only; media is fetched through authorized URLs.

## 4. Browser E2E

`apps/web-merchant/tests/e2e/chat-attachments.spec.ts` (7 journeys, gated by `CHAT_E2E=1`) was executed against an isolated stack — see `PHASE-6-TEST-REPORT.md`.
