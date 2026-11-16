# Communication Platform — Phase 6 Report

Date: 2026-11-16 · Scope: advanced messaging and media.

**Status: COMPLETE WITH DOCUMENTED LIMITATIONS.** Images, PDFs and voice messages work end to end in the existing messenger, verified by integration tests on disposable PostgreSQL + Redis + S3 (LocalStack) and by 7 passing Playwright journeys in Chromium on an isolated stack. Not production-ready without malware scanning and a real-bucket deployment check (§6).

## 1. Acceptance criteria

| #   | Criterion                             | Evidence                                                                                                                  |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Uploads securely authorized           | Reserve = SEND_MESSAGE + live eligibility + writable; presigned single-key PUT, 5 min (integration)                       |
| 2   | Server-side validation                | Policy on declaration + streamed size/SHA-256/magic-byte verification (unit + integration)                                |
| 3   | Ownership and conversation access     | Uploader-only complete/cancel; send requires same conversation + uploader + unused (integration)                          |
| 4   | Unauthorized users cannot retrieve    | 404 for other tenant, ineligible, admin w/o intervention, pending/rejected/deleted; E2E other merchant 404, anonymous 401 |
| 5   | Reliable, idempotent association      | Linking inside the send transaction; rollback on failure; same-`clientMessageId` retry → one message (integration)        |
| 6   | Images and documents in the messenger | Thumbnails, lightbox, document cards, downloads (component + E2E)                                                         |
| 7   | Voice messages                        | Record/stop/cancel, permission/unsupported states, upload, playback (component + E2E with fake mic, Chromium)             |
| 8   | Safe, retryable cleanup               | Claim-then-delete, bounded, idempotent, never touches linked rows; BullMQ scheduler (integration)                         |
| 9   | Regressions pass                      | 108 Phase 1–5 chat integration tests + 1 skip, web 230 prior tests, contracts, API units                                  |
| 10  | Security tests pass                   | See `PHASE-6-SECURITY-REVIEW.md`                                                                                          |
| 11  | Builds pass                           | API `nest build`, web `next build`                                                                                        |
| 12  | Browser E2E attempted                 | Executed: 7/7 passed                                                                                                      |
| 13  | Migration restrictions                | No new migration; 0010/0011 applied only to disposable DBs; drift shim only in throwaway DBs                              |
| 14  | Documentation                         | Eight PHASE-6 documents                                                                                                   |

## 2. What was built

Storage port + S3 adapter; reserve / complete / cancel / download endpoints; central upload policy shared by API and UI; file-signature verification; rejection audit; cleanup (expired, unsent, rejected, orphans) on BullMQ; metrics and structured logs; composer attachments with progress/cancel/retry; image/document/voice rendering; voice recorder; optimistic media messages with idempotent retry; en/bn strings. Details: `PHASE-6-IMPLEMENTATION.md`, API: `PHASE-6-API-REFERENCE.md`, lifecycle: `PHASE-6-ATTACHMENT-LIFECYCLE.md`, operations: `PHASE-6-OPERATIONS.md`.

## 3. Decisions

- **No migration:** the Phase 1 attachment table already models the lifecycle; transient upload phases live only in the UI; unsent attachments are hard-deleted (no message references them).
- **Verification by streaming the object** instead of trusting storage metadata or relying on provider-specific checksum/POST-policy features — works on any S3-compatible provider; costs one read per upload (≤ 20 MiB).
- **Presigned PUT + verify on complete** rather than API-proxied uploads: bytes never pass through the API on the way in.
- **Deleted messages keep their objects** (ADR-019 moderation retention); downloads are refused.

## 4. Tests

Contracts 63/63 · API unit 214/214 · API chat integration 129 + 1 skip (21 new) · Web 247/247 (17 new) · Playwright 7/7 · builds and typechecks pass · lint: no new findings. Full detail: `PHASE-6-TEST-REPORT.md`.

## 5. Known limitations

1. **No malware scanning** (no scanner infrastructure); `UPLOADED` ≠ scanned.
2. Signature checks validate the container header, not full file integrity; no server-side image re-encoding or thumbnails.
3. Browser E2E ran on Chromium only; Safari/Firefox voice formats untested in browsers.
4. LocalStack, not AWS/MinIO, backed the tests (MinIO images unavailable to this environment).
5. Attachments of deleted messages are retained until a Phase 7 retention policy.
6. Staff cannot fetch attachments without first intervening (admin centre is Phase 7).
7. Presigned GET URLs are valid for up to 5 minutes once issued.

## 6. Before production

Configure a private bucket with the CORS/IAM in `PHASE-6-OPERATIONS.md`, add the storage origin to the web CSP, add an asynchronous malware-scan gate, and run the Playwright suite against the real storage provider.

## 7. Phase 1–5 integrity and workspace

All earlier suites pass unchanged except one Phase 4 web test that asserted the absence of attachment controls (replaced; see the test report). No parcel/rider business logic changed. No commits and no `git add` by me; dependencies changed `apps/api/package.json` and `pnpm-lock.yaml` (additive). All Phase 6 changes are unstaged (no external auto-staging observed this phase). The `scripts/*.js` files that wrote directly to the development database (reported in Phase 5) are no longer present in the workspace.

## 8. Can Phase 7 begin?

**Yes.** Carry-overs for Phase 7: malware-scan gate, attachment retention policy for deleted messages, staff attachment access through the admin centre with reasons and audit.
