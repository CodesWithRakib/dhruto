# Communication Platform — Phase 7 Test Report

Date: 2026-11-16 · Windows 11 · Node 22. Every result below comes from commands executed in this phase. Integration and browser tests ran only against **disposable** containers (`dhruto-p7-test-pg` Postgres 16, `dhruto-p7-test-redis` Redis 7, `dhruto-p7-test-s3` LocalStack 3.8, `dhruto-p7-test-clamav` ClamAV 1.4). Migrations 0010–0012 were applied only to the throwaway databases `dhruto_p7_test` and `dhruto_p7_e2e_test`.

## 1. Results

| Check                                                                                                     | Result                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Contracts tests                                                                                           | **Pass** — 6 files, 72/72 (9 new)                                                                                      |
| Contracts typecheck / lint / build                                                                        | **Pass**                                                                                                               |
| API typecheck (`tsc --noEmit`) / build (`nest build`)                                                     | **Pass**                                                                                                               |
| API unit (`vitest run src`)                                                                               | **Pass** — 30 files, 231/231 (17 new incl. 5 clamd-protocol, 2+ grant policy, 3 log redaction)                         |
| API lint (changed files)                                                                                  | **Pass** (0 errors; 0 warnings after replacing `console.log` in the CLI)                                               |
| API chat integration — 6 suites (foundation, phase 2, realtime, logistics, attachments, **admin center**) | **Pass** — 156 passed, 1 skipped (157); final run after all code changes                                               |
| Adapter vs **real ClamAV 1.4** (3.6 M signatures)                                                         | **Pass** — clean → clean; EICAR → `Eicar-Test-Signature`; 3 MB stream → clean; unreachable → error                     |
| Web typecheck / lint (changed files)                                                                      | **Pass**                                                                                                               |
| Web unit/component tests                                                                                  | **Pass** — 43 files, 258/258 (11 new)                                                                                  |
| Web production build (`next build`)                                                                       | **Pass** (built with the isolated stack's `NEXT_PUBLIC_API_URL`)                                                       |
| **Browser E2E Phase 7** (Playwright, Chromium, real ClamAV)                                               | **Pass — 10/10** (journeys 1–12 below)                                                                                 |
| **Browser E2E Phase 6 regression** (same stack, scan gate active)                                         | **Pass — 7/7**                                                                                                         |
| Operator CLI on E2E DB                                                                                    | grant ×2 → `granted`; rider grant → refused (exit 1); `list` shows ids only                                            |
| E2E API log audit                                                                                         | 0 presigned signatures/credentials, 0 bearer tokens, 0 storage keys; after the redaction fix 0 raw `reason`/`q` values |

The single skip is the pre-existing Phase 3 Redis-outage case (needs `CHAT_TEST_REDIS_CONTAINER`). The suites log `AllExceptionsFilter Unhandled exception occurred` lines during Phase 2/realtime negative cases; all those tests pass. I did not verify whether these lines also appeared before Phase 7 (I did not stash the workspace to compare).

## 2. New tests

**Integration — `apps/api/test/chat-admin-center.e2e-spec.ts` (27)**

- Authorization: merchant/rider/customer/hub manager/anonymous denied on admin center; merchant → other merchant 404; unassigned rider 404; other-hub manager 404 on notes; ordinary admin has no grant-required permission; grants: non-admin / non-grantable permission / short reason rejected, idempotent, audited, expiry and revocation immediate, no HTTP grant route.
- Inbox: metadata incl. tracking code/hub/merchant names; no preview/unread for non-participants; listing audit without search text; exact search by tracking code (case-insensitive) and conversation id; partial and injection-like inputs return nothing; hub (incl. parcel's current hub) and participant filters; unknown query key 422; keyset pagination complete and stable; bad cursor 422.
- Intervention: reason required (422) for view/intervene; audited; staff message via normal API identifies `ADMIN`/`MODERATOR`; preview appears once participant.
- Internal notes: absent from participant history, detail, search (customer + merchant), admin export, `event_outbox` payloads and a live participant socket (with positive control); participants get 403 on notes; note reads audited.
- Escalation: permission and note rules, invalid transitions 409, idempotent retry (no extra audit), assignment validation, one notification to assignee, full cycle history, lifecycle untouched, invisible to participants, queue filters.
- Reports: admin-only queue, conversation filter, inbox indicator; review start audited and idempotent; dismiss without note 422; moderation removes message and keeps evidence in `chat_message_edits`; resolution audited.
- Scan gate: pending 409 for participants and 404 for outsiders; CLEAN after scan bound to checksum; INFECTED quarantined/blocked/audited and unsendable; scanner outage → retry → FAILED; replaced object → `checksum_mismatch`, release refused.
- Restricted access: ordinary admin 403/404; granted admin needs reason (422), download is `attachment` with `application/octet-stream`, audited without URLs/keys; release/rescan audited; revoked grant → 404.
- Retention: nothing before the period; after: deleted-message object purged (row kept, `object_purged_at`, audit), evidence-held object kept, live object kept, idempotent; retention status requires its own grant.
- Audit & metrics: action filter, hub manager 403, no delete route, UPDATE rejected by trigger; metrics match fixture data.

**Unit — API:** `clamav-scanner.spec.ts` (5, against an in-process clamd protocol server: chunk framing over 64 KiB, EICAR, unreachable, timeout/drop/garbage, strict parsing); `chat-eligibility.policy.spec.ts` (+2 grant tests, 1 updated — see §3); `redact-url.spec.ts` (3).
**Unit — contracts:** `chat-admin-center.schema.test.ts` (9: escalation table/notes/schema, serve gate, grant list, inbox query bounds, report notes, decision reasons).
**Web:** `tests/unit/chat-admin/chat-admin-ui.test.tsx` (11: permission-aware tabs and unauthorized state, inbox row content/link/no preview, restricted area without grant, escalation transitions + note requirement, hidden actions without permission, reason length, attachment gate clean/pending/cleared/blocked/infected-never-requested, en/bn key parity).

**Browser — `apps/web-merchant/tests/e2e/chat-admin-center.spec.ts` (10 tests covering the 12 required journeys)**

1. Admin opens the Communication Center from the navigation; live metrics. 2. Filters (type) and searches by tracking code; one result; no preview. 3–4. Workspace reason gate → audited history → Join as staff → Open in messenger → staff message sent; customer sees it from `ADMIN`/`MODERATOR`. 5–6. Internal note created/read in the workspace; customer API 403, history/search without it; customer UI never shows it. 7. Escalate → take into review → resolve (UI). 8. Customer report → start review → resolve with note (UI) → `RESOLVED`. 9a. File appears to the customer only after the **real** scanner clears it. 9b. Real clamd paused → upload → FAILED → customer UI "Blocked"; ordinary admin 403/404; granted admin downloads with reason (UI) and rescans after clamd resumes → customer download 200. 10. Hub manager / merchant 403; ordinary admin sees "Restricted area". 11. Audit tab shows intervention (with reason), escalation changes and restricted access. 12. Phase 6 suite (merchant/rider/customer messaging, media, realtime, reconnect) 7/7 on the same stack.

## 3. Changed existing tests (behavior intentionally changed)

| Test                                                                       | Change and reason                                                                                                     |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| API `chat-eligibility.policy.spec.ts` "admin holds every staff permission" | Now "every **non-grant-required** permission"; grant-required ones are asserted separately (Phase 7 narrowing)        |
| Contracts `chat-phase2.schema.test.ts` report review                       | Dismiss without a note is now invalid; with a note valid                                                              |
| API `chat-foundation.e2e-spec.ts`                                          | Table list + entity count include `chat_staff_grants`; rollback test reverts 3 migrations and expects 0012 re-applied |
| API `chat-attachments.e2e-spec.ts`                                         | Starts the test clamd double and runs the scan job after upload (downloads now require CLEAN); assertions unchanged   |
| Web `chat-attachments-ui.test.tsx`                                         | Fixture includes the new required `scanStatus` (`CLEAN`)                                                              |

## 4. Isolated E2E stack (reproducible)

```
docker run -d --rm --name dhruto-p7-test-pg -e POSTGRES_PASSWORD=testpw -e POSTGRES_DB=dhruto_p7_test -p 127.0.0.1:55712:5432 postgres:16-alpine
docker run -d --rm --name dhruto-p7-test-redis -p 127.0.0.1:56712:6379 redis:7-alpine
docker run -d --rm --name dhruto-p7-test-s3 -e SERVICES=s3 -p 127.0.0.1:54712:4566 localstack/localstack:3.8
docker run -d --rm --name dhruto-p7-test-clamav -p 127.0.0.1:53310:3310 clamav/clamav:1.4   # wait for "socket found, clamd started"

# Integration (from apps/api; uses a test-only clamd double, see test/utils/fake-clamd.ts)
CHAT_TEST_DATABASE_URL=postgresql://postgres:testpw@127.0.0.1:55712/dhruto_p7_test CHAT_TEST_REDIS_URL=redis://127.0.0.1:56712 \
CHAT_TEST_S3_ENDPOINT=http://127.0.0.1:54712 npx vitest run test/chat-*.e2e-spec.ts --no-file-parallelism

# Browser stack (throwaway DB)
docker exec dhruto-p7-test-pg createdb -U postgres dhruto_p7_e2e_test
cd apps/api && pnpm build
DATABASE_URL=postgres://postgres:testpw@127.0.0.1:55712/dhruto_p7_e2e_test REDIS_URL=redis://127.0.0.1:56712 node dist/database/migrate-cli.js run
psql … -c 'ALTER TABLE parcels ADD COLUMN IF NOT EXISTS delivery_otp_code varchar(10);'   # throwaway DB only (pre-existing drift, not repaired)
DATABASE_URL=… node dist/database/seed/seed-cli.js
# fixtures: a parcel of merchant@dhruto.com assigned to rider@dhruto.com, recipient_phone = customer@dhruto.com's phone, status ASSIGNED_TO_RIDER;
#           admin2@dhruto.com (ADMIN, no grants). Bucket "dhruto-chat-p7-e2e" with CORS for http://127.0.0.1:3100.
DATABASE_URL=… node dist/chat/staff-grants/chat-staff-grants-cli.js grant --user admin@dhruto.com --permission chat.attachment.restricted_access --reason "E2E security reviewer role" --operator e2e-setup
DATABASE_URL=… node dist/chat/staff-grants/chat-staff-grants-cli.js grant --user admin@dhruto.com --permission chat.attachment.quarantine_manage --reason "E2E security reviewer role" --operator e2e-setup
NODE_ENV=development PORT=4100 DATABASE_URL=… REDIS_URL=… CORS_ORIGIN=http://127.0.0.1:3100 WS_CORS_ORIGINS=http://127.0.0.1:3100 \
  CHAT_STORAGE_BUCKET=dhruto-chat-p7-e2e CHAT_STORAGE_ENDPOINT=http://127.0.0.1:54712 CHAT_STORAGE_FORCE_PATH_STYLE=true \
  CHAT_STORAGE_ACCESS_KEY_ID=test CHAT_STORAGE_SECRET_ACCESS_KEY=test CHAT_CLAMAV_HOST=127.0.0.1 CHAT_CLAMAV_PORT=53310 \
  CHAT_MALWARE_SCAN_INTERVAL_MS=2000 CHAT_MALWARE_SCAN_MAX_ATTEMPTS=1 CHAT_MALWARE_SCAN_RETRY_BASE_SECONDS=1 node dist/main.js
cd apps/web-merchant && NEXT_PUBLIC_API_URL=http://127.0.0.1:4100/api/v1 npx next build && npx next start -p 3100 -H 127.0.0.1
CHAT_E2E=1 CHAT_E2E_PARCEL_ID=<id> CHAT_E2E_TRACKING_CODE=<code> CHAT_E2E_CLAMAV_CONTAINER=dhruto-p7-test-clamav \
  PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3100 PLAYWRIGHT_API_URL=http://127.0.0.1:4100/api/v1 \
  npx playwright test tests/e2e/chat-admin-center.spec.ts --project=chromium --workers=1
```

Both browser specs assume a **fresh parcel conversation** per run (use a new parcel fixture when re-running).

## 5. Run history (honest account)

The Phase 7 browser spec needed four iterations, all test-side: (1) API read raced the optimistic message → poll; (2) re-run reused a conversation the admin had already joined → fresh parcel; (3) role queries ran while a dialog made the page `aria-hidden` → wait for dialog close (DB confirmed the report was resolved); (4) platform-wide audit count included the previous run → "at least 3". Product code was not changed for these. The integration suite found two product issues that were fixed: inbox hub name for parcel threads (parcel's current hub) and case-sensitive email lookup in the grant helper; it also exposed an unhandled promise rejection in the ClamAV adapter on dropped connections (fixed). The E2E log audit found staff reasons/search text in HTTP access logs (fixed by redaction).

## 6. Not executed / limitations of the evidence

- Browsers other than Chromium; mobile/tablet visual verification was not performed (layouts are responsive by construction, not screenshot-verified).
- INFECTED path in the browser: real ClamAV detects EICAR only at file start, which cannot pass the PDF/PNG signature check; INFECTED is covered by integration tests with the test double and the real-clamd adapter smoke test.
- No load/performance tests (inbox, metrics, scan throughput) and no `EXPLAIN ANALYZE` on production-sized data.
- Real AWS S3 / MinIO not used (LocalStack, as in Phase 6).
- Vitest must run from an uppercase `C:\` working directory (known environment quirk).
