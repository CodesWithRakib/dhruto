# Communication Platform — Phase 8 Storage Verification

**Status: BLOCKED for the real provider** — no dedicated non-production bucket or credentials were provided. LocalStack results below verify the suite and the adapter's request signing; they are **not** equivalent to a real deployment.

## 1. Suite

`apps/api/test/chat-storage-provider.e2e-spec.ts` drives the production adapter (`S3ObjectStorage`) against a bucket named by `CHAT_PROVIDER_TEST_BUCKET` (skipped otherwise). Credentials only from environment variables; nothing is printed. Checks:

| #   | Check                                                                            | Real-provider only?                                  |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Keys are server-generated `chat/<conversation>/<attachment>`                     | no                                                   |
| 2   | Presigned PUT works with the signed content type; tampered `Content-Type` → 403  | tamper check skipped in emulator mode                |
| 3   | Stored bytes hash to what was uploaded (server-side verification basis)          | no                                                   |
| 4   | Presigned GET serves the verified type and `Content-Disposition: attachment`     | no                                                   |
| 5   | Expired presigned URL → 403                                                      | no                                                   |
| 6   | Bucket private: anonymous object read and anonymous listing denied               | **yes**                                              |
| 7   | CORS: allowed origin gets `Access-Control-Allow-Origin`; another origin does not | needs `CHAT_PROVIDER_TEST_ALLOWED_ORIGIN`            |
| 8   | API credentials cannot write outside `chat/` (IAM scope)                         | **yes** (`CHAT_PROVIDER_TEST_EXPECT_PREFIX_SCOPE=1`) |
| 9   | Listing bounded to prefix; delete idempotent; object gone afterwards             | no                                                   |

## 2. Results on emulators (executed)

| Run                                                                 | Passed                        | Notes                                                                                                                                                   |
| ------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LocalStack 3.8 default, emulator mode                               | 6 / 7 run, 2 skipped          | **Expired presigned URL was accepted (200)** — LocalStack does not validate signatures by default. Phases 6/7 therefore never verified URL expiry.      |
| LocalStack 3.8 with `S3_SKIP_SIGNATURE_VALIDATION=0`, emulator mode | 7 / 7 run, 2 skipped          | Expiry enforced → adapter signs correctly                                                                                                               |
| Same, strict mode (no emulator flag)                                | 7 passed, 1 failed, 1 skipped | Tampered content type rejected (403). **Anonymous read allowed** — LocalStack does not enforce bucket privacy; only a real provider can verify check 6. |

## 3. How to run against the real provider (when authorized)

```
CHAT_PROVIDER_TEST_BUCKET=<dedicated-nonprod-bucket> CHAT_PROVIDER_TEST_REGION=<region> \
[CHAT_PROVIDER_TEST_ENDPOINT=<s3-compatible endpoint>] \
CHAT_PROVIDER_TEST_ACCESS_KEY_ID=… CHAT_PROVIDER_TEST_SECRET_ACCESS_KEY=… \
CHAT_PROVIDER_TEST_ALLOWED_ORIGIN=https://<staging-web-origin> CHAT_PROVIDER_TEST_EXPECT_PREFIX_SCOPE=1 \
npx vitest run test/chat-storage-provider.e2e-spec.ts        # from apps/api, uppercase C:\ on Windows
```

Then, with the staging stack pointed at the same bucket: run the Phase 6 and Phase 7 Playwright suites (browser PUT/GET through CORS), confirm the web CSP (if adopted, D-12) allows the storage origin in `img-src`, `media-src` and `connect-src`, and run `test/recovery/chat-storage-consistency.mjs`.

## 4. Provider configuration requirements (unchanged from Phase 6, re-checked)

Block all public access; no bucket policy granting anonymous access; IAM for the API: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `chat/*`, `s3:ListBucket` with prefix `chat/`; CORS for the web origin (PUT, GET, HEAD; header `content-type`); optional versioning (recommended for recovery, D-10); lifecycle rule aborting incomplete multipart uploads (defence in depth). Quarantine is a database state — blocked objects stay in the bucket under the same key until retention purges them; no separate quarantine bucket is used.
