# Communication Platform — Phase 7 Report

Date: 2026-11-16 · Scope: Admin Communication Center.

**Status: COMPLETE WITH DOCUMENTED LIMITATIONS.** The admin center works end to end on real backend data, verified by 27 new integration tests on disposable PostgreSQL + Redis + S3 (LocalStack), an adapter smoke test against real ClamAV 1.4, and 10/10 Playwright journeys in Chromium (plus the Phase 6 browser suite 7/7) on an isolated stack with a real ClamAV daemon. It is **not production-ready** until the product decisions in §5 are made and clamd is deployed and monitored.

## 1. Acceptance criteria

| #   | Criterion                                                   | Evidence                                                                                                      |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Admin center works with real backend data                   | Inbox/metrics/escalation/reports/attachments/audit from live APIs; E2E journeys 1–11                          |
| 2   | Inbox and filters permission-scoped                         | ADMIN + `view_any`; restricted types gated; content only for participants; integration + E2E                  |
| 3   | Intervention requires permission and reason                 | Unchanged single writer; 422 without reason; E2E 3–4                                                          |
| 4   | Internal notes private across REST, sockets, search, caches | Integration (REST, search, export, outbox, live socket); E2E 5–6; notes never cached outside staff RTK tags   |
| 5   | Escalation and report workflows functional and audited      | Integration + E2E 7–8                                                                                         |
| 6   | Moderation preserves evidence and audit                     | Soft delete + `chat_message_edits`; audit rows; retention evidence hold                                       |
| 7   | Attachment access respects scan status and authorization    | Gate + grants; integration + E2E 9a/9b with real clamd                                                        |
| 8   | Retention documented and safely implemented                 | `PHASE-7-ATTACHMENT-RETENTION.md`; claim→delete with rollback; disabled by default for linked attachments     |
| 9   | Audit history reliable                                      | Same-transaction writes; append-only; action filter; E2E 11                                                   |
| 10  | Phase 1–6 regressions pass                                  | 129 prior chat integration tests + 1 pre-existing skip; web 247 prior tests; Phase 6 browser 7/7              |
| 11  | Backend and frontend builds pass                            | `nest build`, `next build`                                                                                    |
| 12  | Browser E2E attempted and documented                        | Executed: 10/10 + 7/7 (`PHASE-7-TEST-REPORT.md`)                                                              |
| 13  | Migration restrictions respected                            | One additive migration 0012; 0010–0012 applied only to throwaway DBs; drift shim only in the throwaway E2E DB |
| 14  | Documentation                                               | Eleven PHASE-7 documents                                                                                      |

## 2. What was built

Per-user grants for three sensitive permissions (CLI-managed, audited); operational inbox with exact-identifier search and filters; live metrics; escalation workflow with history and assignee notification; audited note reads and report reviews; ClamAV-backed asynchronous malware gate (fail closed, checksum-bound verdicts, retries, quarantine); staff attachment review (queue, restricted download, release/rescan); retention for deleted-message and quarantined objects with evidence holds; access-log redaction; admin UI (overview, inbox, escalations, reports, attachment security, audit, conversation workspace) in English and Bangla; messenger scan-state UI. Details: `PHASE-7-IMPLEMENTATION.md`, API: `PHASE-7-API-REFERENCE.md`, UX: `PHASE-7-ADMIN-UX.md`, authorization: `PHASE-7-AUTHORIZATION-MATRIX.md`, policies: escalation / moderation / retention documents, security: `PHASE-7-SECURITY-REVIEW.md`.

## 3. Tests

Contracts 72/72 · API unit 231/231 · API chat integration 156 + 1 skip (27 new) · Web 258/258 (11 new) · Playwright 10/10 (Phase 7) + 7/7 (Phase 6) · builds, typechecks and lint on changed files pass. Full detail: `PHASE-7-TEST-REPORT.md`.

## 4. Known limitations

1. Malware protection = ClamAV signatures only; quality depends on deployment and signature freshness. No clamd is deployed by this work.
2. INFECTED path verified in integration (test double) and adapter smoke test, not in the browser (real ClamAV only flags EICAR at file start).
3. ADMIN keeps every non-grant-required chat permission (reason + audit, not prevention); hub managers have no admin-center view.
4. Staff queues use polling/invalidation (no staff realtime channel); no assignee picker for other admins (API supports it).
5. Inbox search is exact-identifier only; no staff content search.
6. Retention for linked attachments is off until periods are configured; message/audit/report retention undefined.
7. No load tests; Chromium only; mobile/tablet layouts not screenshot-verified; LocalStack instead of real S3.
8. Breaking API changes: report resolve/dismiss now require a note; participant downloads return 409 until scanned (clients without the new UI show an error instead of the security-check state).

## 5. Before production

Deploy clamd privately (`CHAT_CLAMAV_HOST`), monitor signatures and the `scanFailed`/`scanPending` counters and alert on growth; decide retention periods; decide who holds the three grants and for how long; decide on two-person release; plan the existing `UPLOADED` attachments backlog (they become `PENDING` at migration and are scanned by the job — expect a burst); run the browser suites against real S3.

## 6. Workspace and safety

- No commits and **no `git add` by me**. **External auto-staging observed:** most Phase 7 files appear staged in the index (status `A`/`M` in the first column) although I never staged anything; files created later (e.g. `redact-url.ts`, the `chat-admin` web feature, several docs) are unstaged. I did not reset or alter the index.
- Unrelated files were not modified. One shared file outside the chat module changed deliberately: `apps/api/src/common/interceptors/logging.interceptor.ts` (log redaction, a security fix found by this phase's log audit).
- `apps/api/package.json` gained the `chat:grants` script (no new dependencies).
- Disposable containers used: `dhruto-p7-test-pg`, `-redis`, `-s3`, `-clamav` (stopped at the end of the phase).
- No production credentials or databases touched; 0010/0011/0012 never applied to shared or development databases; `delivery_otp_code` drift not repaired outside throwaway DBs.
