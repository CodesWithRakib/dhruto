# Communication Platform — Phase 6 Audit (attachments & media)

Date: 2026-11-16 · Baseline: commit `5dd84df` (Phase 5), clean working tree.

## 1. Existing attachment model

| Layer                                                 | Found                                                                                                                                                                                                                                                                                           | Limitation                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Table `chat_attachments` (migration 0010)             | `conversation_id`, `message_id` (nullable, FK RESTRICT), `uploader_user_id`, unique server `storage_key` (512), `original_filename`, `mime_type`, `size_bytes > 0`, `checksum_sha256` (CHECK lowercase hex), `status` (`PENDING`/`UPLOADED`/`REJECTED`), `uploaded_at` (required when UPLOADED) | Nothing writes it: no reservation, upload, completion, download or cleanup code exists |
| Contracts                                             | `createChatAttachmentSchema` (filename safety, MIME allow-list, size ≤ 25 MiB, checksum); send variants `IMAGE`/`FILE` (1–10 ids), `VOICE` (exactly 1 + `durationMs`); `ChatAttachmentItem` (no storage key)                                                                                    | Upload/download endpoints and responses undefined; single global size ceiling only     |
| Message send (`ChatMessageService.assertAttachments`) | Attachments row-locked; must exist, be in the same conversation, belong to the sender, be `UPLOADED`, be unused (`message_id` null); IMAGE ⇒ `image/*`, VOICE ⇒ `audio/*`; linked in the send transaction; idempotent replay by `clientMessageId`                                               | Works once attachments can reach `UPLOADED`                                            |
| History / realtime                                    | `ChatMessageReaderService` loads attachments per page; mapper hides attachments of deleted messages; realtime fan-out reuses the mapped message (metadata only)                                                                                                                                 | No way to fetch bytes                                                                  |
| Deletion                                              | ADR-019: deleted message content retained for moderation; attachment rows keep `message_id` (FK RESTRICT)                                                                                                                                                                                       | Retention of attachment objects for deleted messages undefined                         |

## 2. Storage integration

None. No S3/S3-compatible client, presigner, multer or file module exists in `apps/api` (`riders` stores a client-supplied `proofPhotoUrl` string only). There is nothing to extend, so Phase 6 introduces **one** storage port inside the chat module (`ChatObjectStorage`) with an S3-compatible adapter (AWS SDK v3; works with AWS S3, MinIO, LocalStack, R2). Dependencies added: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

Test storage: Docker Hub `minio/minio` and Quay's MinIO images are not pullable here (access denied / 401). `localstack/localstack:3.8` (S3 with SigV4 presigning and CORS) is used for integration and browser tests.

## 3. Missing backend capabilities

Upload authorization (reserve + presigned PUT), completion with server-side verification (size, SHA-256, magic bytes), cancel, secure download URLs, central upload policy (per-type size limits, MIME↔extension↔signature mapping), cleanup jobs (expired pending, rejected, unsent abandoned, orphaned objects), metrics/logging, rate limits.

## 4. Missing frontend capabilities

Composer attachment selection, hashing + direct upload with progress/cancel/retry, attachment chips, sending IMAGE/FILE/VOICE messages through the existing optimistic pipeline, image thumbnails + lightbox, document cards with download, voice recording (MediaRecorder) and playback, en/bn strings.

## 5. Security risks to address

Trusting client MIME/size/name/key; public bucket or long-lived URLs; cross-conversation or cross-user attachment reuse; serving pending/rejected/deleted-message files; polyglot/masquerading files (e.g. HTML/SVG labelled as image); content sniffing on download; path traversal through filenames; presigned URLs in logs or realtime events; storage credential exposure; upload abuse (rate/size); orphaned objects accumulating.

## 6. Required changes

- **Schema:** none. Existing states suffice (`PENDING → UPLOADED | REJECTED`); upload expiry derives from `created_at` + TTL; rejection reasons go to the existing `ATTACHMENT_REJECTED` audit action; unsent attachments are removed by hard-deleting the row (no message reference exists). **No migration.**
- **Contracts:** central upload policy (`CHAT_UPLOAD_POLICY`), reserve response (`ChatAttachmentUploadTicket`), download response, `ChatAttachmentItem.kind`; existing schemas reused.
- **API:** `POST /chat/conversations/:id/attachments`, `POST /chat/attachments/:id/complete`, `DELETE /chat/attachments/:id`, `GET /chat/attachments/:id/download`.

## 7. Strategy

1. Contracts → storage port + S3 adapter + in-memory fake → policy and signature sniffing (unit-tested).
2. Attachment service/controller with membership + capability checks, audit, rate limits; completion streams the object to verify size/hash/signature (never trusts `HEAD`/client data alone).
3. Cleanup service (bounded, idempotent) scheduled with BullMQ (existing Redis) with an in-process fallback.
4. Integration tests against disposable PostgreSQL + Redis + LocalStack; regression of all chat suites.
5. Frontend upload manager, composer, rendering, voice; component tests.
6. Isolated browser stack (DB + Redis + LocalStack + built API + built web) and Playwright journeys.

Malware scanning: no scanner (ClamAV or similar) exists in the infrastructure and a new service is out of scope; `UPLOADED` therefore means "type/size/integrity verified", **not** "malware-scanned" — documented in the security review and never presented as safe in the UI.
