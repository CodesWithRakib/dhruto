# Communication Platform — Phase 8 Baseline Audit

Date: 2026-11-16 · Written from the repository at `7b8304b` (Phase 7 committed by the owner; working tree clean, nothing staged or unstaged at start) before any Phase 8 change. Previous reports were treated as claims to verify, not as evidence.

## 1. Current architecture (verified in code)

| Component        | Implementation                                                                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API              | NestJS modular monolith (`apps/api`), chat in `src/chat/*` (REST, admin, attachments, realtime, logistics sync)                                                                                                                                       |
| Web              | Next.js 16 App Router (`apps/web-merchant`), one app for all five roles; shared messenger (`features/chat`) mounted in every role's `messages/layout.tsx`; admin center (`features/chat-admin`)                                                       |
| Database         | PostgreSQL 16; chat tables from migrations 0010–0012; transactional outbox `event_outbox`                                                                                                                                                             |
| Queues           | BullMQ on Redis: job schedulers `chat-attachment-cleanup`, `chat-attachment-scan`; notifications/webhooks queues                                                                                                                                      |
| Realtime         | Socket.IO `/chat` namespace, Redis adapter (`@socket.io/redis-adapter`), presence in Redis, delivery from outbox fan-out                                                                                                                              |
| Object storage   | S3 API (`S3ObjectStorage`), private bucket, presigned PUT/GET (5 min); tested only on LocalStack before Phase 8                                                                                                                                       |
| Malware scanning | ClamAV adapter (clamd `zINSTREAM` over TCP), asynchronous gate; **no deployment existed** before Phase 8                                                                                                                                              |
| Deployment       | **Not defined for the API**: no API/worker Dockerfile, no manifests; web has `output: "standalone"`. `docker-compose.yml` (local) has Postgres + Redis only. CI (`.github/workflows/ci.yml`) runs lint/typecheck/unit/build and a main-branch E2E job |

## 2. Implementation status

Phases 1–7 are implemented and committed. Phase 7 status was "COMPLETE WITH DOCUMENTED LIMITATIONS". Re-verified at baseline on disposable infrastructure: 157/157 chat integration tests including the Redis outage/recovery test, which had been skipped in every earlier phase (needs a stoppable Redis container).

## 3. Outstanding limitations carried into Phase 8

| Source   | Limitation                                                                     | Phase 8 disposition                                                                   |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| P2       | Search: whole-word FTS, statistics-driven plan, "benchmark at volume"          | Benchmarked → finding F-PERF-1                                                        |
| P2/P3    | No issuer/audience JWT claims (platform-wide)                                  | Unchanged; decision D-11                                                              |
| P2/P7    | ADMIN holds every non-grant-required chat permission                           | Decision D-4                                                                          |
| P3       | ≤60 s ephemeral revocation window for eligibility changes without a chat event | Documented (eventual consistency)                                                     |
| P3       | Production Redis needs TLS + auth                                              | Release checklist                                                                     |
| P3/P6/P7 | No load test                                                                   | Executed (bounded by workstation capacity)                                            |
| P4       | No manual screen-reader / cross-browser QA                                     | Cross-browser automated QA executed; manual SR not performed                          |
| P5       | No chat notifications per message (by design)                                  | Unchanged                                                                             |
| P6/P7    | LocalStack only; real provider unverified                                      | Suite prepared; **BLOCKED** (no credentials)                                          |
| P6/P7    | Malware scanning not deployed                                                  | Reference deployment created and verified locally; production deployment **not done** |
| P7       | Retention periods undefined                                                    | Decision D-1                                                                          |
| P7       | Breaking API changes (report note; 409 until scanned)                          | Compatibility audit                                                                   |
| P7       | Existing attachments become PENDING at migration (backlog burst)               | Backlog strategy tested                                                               |
| P2       | `delivery_otp_code` schema drift (pre-existing, unrelated)                     | Unchanged; blocks clean migrate+seed on fresh DBs                                     |

## 4. Existing security controls (verified)

Live eligibility on every request; ACTIVE membership; 404 for non-visible resources; staff path = permission + reason + same-transaction audit; per-user grants for three permissions (CLI-only); append-only audit (UPDATE trigger); internal notes in a separate table with no outbox events; strict zod contracts; per-user rate limits; socket JWT with mandatory `exp`, Origin allow-list; server-generated object keys; checksum/size/magic-byte verification; fail-closed malware gate; access-log redaction of `reason`/`q`.

## 5. Infrastructure dependencies

PostgreSQL (≥ 16), Redis (queues, Socket.IO adapter, presence, rate limits), S3-compatible private bucket with CORS for the web origin, clamd reachable on a private network, outbound HTTPS for freshclam, SMTP/SMS providers (unrelated to chat).

## 6. Migration status and rollout risks

0010–0012 applied **only** to disposable databases. Risks: 0012 constraint validation and index builds lock chat tables briefly (measured, see rollout doc); all existing attachments become `PENDING` and undownloadable until scanned (backlog); 0010 `down` destroys chat data.

## 7. API compatibility risks

Report resolve/dismiss now require a note (422 otherwise); participant downloads return 409 until a CLEAN verdict; new `scanStatus` field. All in-repo clients were audited (compatibility doc).

## 8. Test coverage and missing categories at baseline

Present: contracts, API unit, 6 chat integration suites, web unit, Chromium Playwright (Phase 6/7). Missing at baseline: Firefox/WebKit/tablet/phone, accessibility automation, load/soak, real storage provider, real ClamAV in CI, restore drill for chat data, scanner fail-closed matrix beyond Phase 7 (timeout, duplicate jobs, Redis down), chat suites in CI (all env-gated, so CI skips them).

## 9. Production blockers identified at baseline

1. Critical Next.js advisories on the installed version (found in this phase's dependency audit).
2. No API deployment definition; no ClamAV deployment; no chat metrics for alerting.
3. Retention, grant ownership, ADMIN policy and other product decisions unmade.
4. Real storage provider unverified.
5. No load evidence; backups never restored with chat data.

## 10. Recommended release sequence

See `PHASE-8-RELEASE-CHECKLIST.md`: dependency patch → staging stack (incl. clamd) → migrations on a staging copy with backup → backlog scan → storage-provider suite → load profiles on staging hardware → product sign-offs → production with feature exposure staged by role.
