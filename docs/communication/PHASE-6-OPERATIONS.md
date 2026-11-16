# Communication Platform — Phase 6 Operations

## 1. Environment variables (API)

| Variable                                                              | Default                                 | Purpose                                                                        |
| --------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| `CHAT_STORAGE_BUCKET`                                                 | — (attachments disabled, endpoints 503) | Private bucket for chat attachments                                            |
| `CHAT_STORAGE_REGION`                                                 | `us-east-1`                             | Region                                                                         |
| `CHAT_STORAGE_ENDPOINT`                                               | AWS default                             | S3-compatible endpoint used by the API (MinIO, R2, LocalStack)                 |
| `CHAT_STORAGE_PUBLIC_ENDPOINT`                                        | = endpoint                              | Endpoint placed in presigned URLs when browsers reach storage via another host |
| `CHAT_STORAGE_FORCE_PATH_STYLE`                                       | `false`                                 | `true` for MinIO/LocalStack                                                    |
| `CHAT_STORAGE_ACCESS_KEY_ID` / `CHAT_STORAGE_SECRET_ACCESS_KEY`       | SDK provider chain                      | Prefer an instance/task role in production; never commit values                |
| `CHAT_UPLOAD_URL_TTL_SECONDS`                                         | 300                                     | Presigned PUT lifetime                                                         |
| `CHAT_DOWNLOAD_URL_TTL_SECONDS`                                       | 300                                     | Presigned GET lifetime (web caches URLs ≤ 120 s)                               |
| `CHAT_PENDING_UPLOAD_TTL_SECONDS`                                     | 3600 (≥ 2× PUT TTL)                     | Expiry of unfinished uploads                                                   |
| `CHAT_UNSENT_ATTACHMENT_TTL_SECONDS`                                  | 86400                                   | Removal of verified-but-never-sent files                                       |
| `CHAT_REJECTED_ATTACHMENT_RETENTION_SECONDS`                          | 604800                                  | Purge of rejected rows                                                         |
| `CHAT_ATTACHMENT_CLEANUP_INTERVAL_MS`                                 | 600000                                  | Cleanup schedule                                                               |
| `CHAT_ATTACHMENT_CLEANUP_BATCH`                                       | 100                                     | Rows/objects per category per run                                              |
| `CHAT_ATTACHMENT_CLEANUP_ENABLED`                                     | `true`                                  | `false` disables scheduling (tests)                                            |
| `CHAT_MAX_PENDING_UPLOADS_PER_USER`                                   | 20                                      | Abuse limit                                                                    |
| `CHAT_RATE_LIMIT_UPLOAD_PER_MIN` / `CHAT_RATE_LIMIT_DOWNLOAD_PER_MIN` | 30 / 240                                | Per-user rate limits                                                           |

## 2. Bucket configuration

- **Block all public access**; no bucket policy granting anonymous reads; versioning optional.
- IAM for the API: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:…:bucket/chat/*`, `s3:ListBucket` on the bucket with prefix `chat/` (orphan sweep). Nothing else.
- **CORS** (browsers upload and fetch directly):
  ```json
  [
    {
      "AllowedOrigins": ["https://<web-origin>"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["content-type"],
      "ExposeHeaders": ["etag"],
      "MaxAgeSeconds": 600
    }
  ]
  ```
- Optional lifecycle rule as defence in depth: abort incomplete multipart uploads after 1 day (the API uses single PUTs).
- Content Security Policy of the web app must allow the storage origin in `img-src` and `media-src` (and `connect-src` for the PUT).

## 3. Observability

Structured log events (no URLs, tokens, credentials or file contents): `chat.attachment.reserved`, `.completed`, `.rejected reason=…`, `.download_denied reason=…`, `.storage_error operation=… error=<name>`, `.cleanup …counts`, `.cleanup_scheduled`, `.cleanup_schedule_failed`. Per-instance counters in `ChatAttachmentMetrics` (reserved, completed, rejected by reason, cancelled, downloads authorized/denied, storage errors, cleanup deleted/orphans/runs). `ATTACHMENT_REJECTED` rows in `chat_audit_logs`.

## 4. Runbook

- **503 `CHAT_STORAGE_UNAVAILABLE`:** bucket not configured, credentials/IAM wrong, or provider down; check `chat.attachment.storage_error` logs.
- **Uploads fail in the browser with CORS errors:** bucket CORS origin list; `CHAT_STORAGE_PUBLIC_ENDPOINT` must be reachable by browsers.
- **Cleanup not running:** look for `chat.attachment.cleanup_scheduled` at boot; requires Redis; BullMQ queue `chat-attachment-cleanup`.
- **Capacity:** completion streams each file once through the API (≤ 20 MiB), so plan API egress/ingress from storage accordingly.

## 5. Deployment notes

No database migration. New dependencies `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`. Without `CHAT_STORAGE_BUCKET` the rest of chat works and attachment endpoints fail closed.
