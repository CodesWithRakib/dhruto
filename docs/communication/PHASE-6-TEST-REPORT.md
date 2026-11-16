# Communication Platform — Phase 6 Test Report

Date: 2026-11-16 · Windows 11. All results below come from commands executed in this phase. Integration and browser tests ran only against **disposable** containers (`dhruto-p6-test-*`, `dhruto-p6-e2e-*`), all stopped afterwards. Migrations 0010/0011 were applied **only** to those throwaway databases.

## 1. Results

| Check                                                                                                                         | Result                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Contracts tests                                                                                                               | **Pass** — 5 files, 63/63 (5 new)                                          |
| Contracts typecheck / lint / build                                                                                            | **Pass**                                                                   |
| API typecheck (`tsc --noEmit`)                                                                                                | **Pass**                                                                   |
| API build (`nest build`)                                                                                                      | **Pass**                                                                   |
| API unit specs (`vitest run src`)                                                                                             | **Pass** — 27 files, 214/214 (6 new)                                       |
| API chat integration (foundation, phase 2, realtime, logistics, **attachments**) on Postgres 16 + Redis 7 + LocalStack 3.8 S3 | **Pass** — 129 passed, 1 skipped (130); 21 new                             |
| API lint, changed files                                                                                                       | **Pass**; whole-app lint unchanged (1 pre-existing error `src/main.ts:90`) |
| Web typecheck                                                                                                                 | **Pass**                                                                   |
| Web lint                                                                                                                      | **Pass** — 0 errors, 67 pre-existing warnings (changed files clean)        |
| Web unit/component tests                                                                                                      | **Pass** — 42 files, 247/247 (17 new)                                      |
| Web production build                                                                                                          | **Pass** (built with the isolated stack's `NEXT_PUBLIC_API_URL`)           |
| **Browser E2E (Playwright, Chromium)**                                                                                        | **Pass — 7/7** on the isolated stack                                       |

The single skip is the Phase 3 Redis-outage case (needs `CHAT_TEST_REDIS_CONTAINER`).

## 2. New tests

**API integration — `apps/api/test/chat-attachments.e2e-spec.ts` (21)**, real presigned PUT/GET against LocalStack:
reserve returns PENDING + presigned PUT with server key and no internals; other tenant / ineligible rider / admin without intervention → 404; policy (SVG, wrong extension, oversize, traversal) → 422; per-user unfinished-upload limit; complete before upload → 422 and still PENDING; complete idempotent incl. concurrent; magic-byte mismatch → REJECTED + object deleted + audit (reason, DB role); checksum and size mismatch → REJECTED; complete/cancel by non-uploader → 404; image message with safe metadata only in history; authorized download returns exact bytes with verified `Content-Type`; forced download sets attachment disposition; non-members/other tenant/ineligible/admin → 404; PDF downloads as attachment; multiple attachments in one message; voice message; pending/foreign/reused/cross-conversation/wrong-type attachments → 422; failed send rolls back the link; retried send (same `clientMessageId`) → same message, single link; pending never downloadable, unsent only by uploader; deleting the message stops downloads but keeps the object; cancel removes unsent only; text-only regression; cleanup removes expired/unsent/rejected/orphans, never linked attachments, idempotently.

**API unit — `file-signature.spec.ts` (6):** genuine signatures for all 8 types; HTML/SVG/EXE/cross-type masquerades rejected; truncated input; MPEG frame sync; Content-Disposition escaping (quotes, backslash, non-ASCII); server key format.

**Contracts — `chat-attachments.schema.test.ts` (5):** policy coverage/limits, extension matching, per-type size, reservation schema, kinds/extensions.

**Web — `tests/unit/chat/chat-attachments-ui.test.tsx` (17):** policy/MIME helpers; SHA-256; identical media send requests on retry; upload hook full lifecycle with progress; client-side rejection without server calls; retry with fresh reservation (old cancelled); server rejection shown with localized reason; remove aborts and cancels; composer blocks send during upload then sends IMAGE with caption; unsupported file toast; image thumbnail + lightbox; document card + download through a fresh URL (filename rendered as text); voice player; recorder never touches the mic before click; unsupported and denied states; record → upload → VOICE send with mic released; optimistic media bubble deduplicated against REST + realtime copies.

**Browser — `apps/web-merchant/tests/e2e/chat-attachments.spec.ts` (7, all passed, 43 s):**

1. Merchant logs in (real form), opens the parcel page, "Message about this parcel", uploads an image, sends with caption; the image renders (`naturalWidth > 0`).
2. Image opens in the preview dialog and closes with Escape.
3. PDF uploads, sends, downloads (`download` event, filename `invoice.pdf`, page not navigated).
4. Voice message recorded with Chromium's fake microphone, uploaded, rendered as an audio player.
5. The assigned rider (second browser context) sees the image (rendered), PDF and voice message.
6. A newly registered merchant (other tenant) gets 404 for the image download; anonymous gets 401.
7. Reload keeps history; merchant text reaches the rider in realtime; a message sent while the rider was offline (`context.setOffline`) arrives after reconnect.

API log audit after the run: 0 presigned signatures, credentials or bearer tokens logged.

## 3. Changed existing tests

- Web `chat-components.test.tsx`: composer helper passes the new `conversationId` prop; the Phase 4 test "has no attachment controls (out of scope until Phase 6)" was replaced by "offers attachment and voice controls restricted to the upload policy" — the feature it guarded against now exists.

## 4. Isolated E2E stack (reproducible)

```
docker run -d --rm --name e2e-pg -e POSTGRES_USER=e2e -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=dhruto_e2e_test -p 58433:5432 postgres:16-alpine
docker run -d --rm --name e2e-redis -p 58380:6379 redis:7-alpine
docker run -d --rm --name e2e-s3 -e SERVICES=s3 -p 54566:4566 localstack/localstack:3.8
# create bucket "dhruto-chat-e2e" with CORS for http://127.0.0.1:3100 (PUT/GET/HEAD, content-type)
cd apps/api && pnpm build
DATABASE_URL=postgres://e2e:e2e@127.0.0.1:58433/dhruto_e2e_test node dist/database/migrate-cli.js run
psql …  ALTER TABLE parcels ADD COLUMN IF NOT EXISTS delivery_otp_code varchar(10)   # throwaway DB only (pre-existing drift)
NODE_ENV=development PORT=4100 DATABASE_URL=… REDIS_URL=redis://127.0.0.1:58380 CORS_ORIGIN=http://127.0.0.1:3100 \
  WS_CORS_ORIGINS=http://127.0.0.1:3100 CHAT_STORAGE_BUCKET=dhruto-chat-e2e CHAT_STORAGE_ENDPOINT=http://127.0.0.1:54566 \
  CHAT_STORAGE_FORCE_PATH_STYLE=true CHAT_STORAGE_ACCESS_KEY_ID=test CHAT_STORAGE_SECRET_ACCESS_KEY=test node dist/main.js
# insert a parcel of merchant@dhruto.com assigned to rider@dhruto.com (status ASSIGNED_TO_RIDER)
cd apps/web-merchant && NEXT_PUBLIC_API_URL=http://127.0.0.1:4100/api/v1 pnpm build && npx next start -p 3100 -H 127.0.0.1
CHAT_E2E=1 CHAT_E2E_PARCEL_ID=<id> PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_API_URL=http://127.0.0.1:4100/api/v1 \
  npx playwright test tests/e2e/chat-attachments.spec.ts --project=chromium --workers=1
```

## 5. Not executed / limitations of the evidence

- Browsers other than Chromium (Firefox/WebKit voice formats, Safari `audio/mp4`) were not run; MediaRecorder format selection covers webm/ogg/mp4 by design.
- Real AWS S3 / MinIO were not used (MinIO images were not pullable from Docker Hub or Quay); LocalStack exercised the same SigV4 presigning, CORS and S3 API.
- Malware scanning: not implemented (no scanner infrastructure).
- The Phase 6 E2E spec is serial and assumes a fresh conversation; re-running it against the same stack may hit strict-mode duplicates (image alt text) — recreate the stack or use a new parcel.
- Vitest must run from an uppercase `C:\` working directory (known environment quirk).
