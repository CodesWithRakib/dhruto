# Communication Platform — Phase 8 Final Report

Date: 2026-11-16 · Scope: production readiness, security and scalability verification.

## Verdict: **NOT PRODUCTION READY**

The communication platform is functionally complete and passes extensive security, reliability and cross-browser testing on disposable infrastructure. It must not go to production yet because several mandatory items are unverified or blocked: a critical dependency vulnerability in the web framework, no real storage-provider verification, no production ClamAV deployment, no approved retention/permission decisions, no load evidence on production-like hardware, and no API deployment definition.

## 1. Mandatory requirements

| #   | Requirement                                          | State                                                                           | Evidence / gap                                                                                                     |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Security review                                      | Implemented and verified (with open findings)                                   | `PHASE-8-SECURITY-ASSESSMENT.md`; F-1 critical (Next.js) and F-2 high (zod etc.) open                              |
| 2   | Authorization and tenant isolation                   | Implemented and verified                                                        | 169/169 chat integration incl. 5-role isolation, socket rooms, revocation; browser denials                         |
| 3   | Malware scanning deployment and fail-closed behavior | Fail-closed **verified** (real ClamAV + matrix); **not operationally deployed** | Reference deployment verified locally; production clamd + monitoring owner pending (D-6)                           |
| 4   | Approved retention policies                          | **Awaiting product-owner decision**                                             | Purges disabled; guards tested (D-1)                                                                               |
| 5   | Real storage-provider verification                   | **Blocked** (no bucket/credentials)                                             | Suite ready; LocalStack is not equivalent (expiry unverified by default emulator)                                  |
| 6   | Migration and backlog rollout safety                 | Verified on emulated scale                                                      | Rehearsal at 50 k/150 k rows, lock ≤ 694 ms; backlog controls tested; throughput 202–1,270 files/min (workstation) |
| 7   | API compatibility                                    | Verified                                                                        | All in-repo clients handle 409/notes; old bundles fail closed                                                      |
| 8   | Browser QA                                           | Verified (automated)                                                            | Chromium, Firefox, WebKit, tablet, phone; no manual screen reader                                                  |
| 9   | Performance testing                                  | Tested on workstation only                                                      | No approved targets; bottlenecks identified (search, DB CPU, outbox relay ceiling)                                 |
| 10  | Observability and alerting                           | Implemented; alert rules defined, **not deployed**                              | `/health/chat`, chat Prometheus metrics, runbook alerts                                                            |
| 11  | Backup and restore verification                      | Verified for chat data in a disposable environment                              | PITR and object-storage restore not tested                                                                         |
| 12  | Deployment and rollback readiness                    | Documented; **not implemented**                                                 | No API image/manifests; checklist ready                                                                            |

## 2. Changes made in Phase 8 (deliberate fixes, separated from documentation/tests)

| Area                         | Change                                                                                                                                                            | Why                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Malware scan (F-OPS-1)       | `ChatAttachmentScanService` probes clamd before claiming; no claims while unreachable; bounded parallel scans (`CHAT_MALWARE_SCAN_CONCURRENCY`, default 2, max 8) | An outage turned every pending file FAILED after ≈ 7–8 min; backlog throughput                |
| Scanner health               | `ChatMalwareScanner.probe()` (clamd `zPING`/`zVERSION`), explicit ctime parsing                                                                                   | Liveness + signature freshness                                                                |
| Observability (F-OBS-1)      | `ChatObservabilityModule/Service`; `GET /health/chat`; chat lines in `/health/metrics/prometheus`                                                                 | Required alerts were impossible                                                               |
| **Shared** cache (F-AVAIL-1) | `commandTimeout: 500` in `apps/api/src/common/cache/cache.service.ts`                                                                                             | Hung Redis froze every chat REST request > 60 s; fix makes the existing fallback work         |
| Accessibility (F-A11Y-1)     | `ReasonDialog` restores focus to its opener                                                                                                                       | Keyboard/screen-reader users lost their place                                                 |
| Deployment                   | `deploy/clamav/{docker-compose.clamav.yml, clamd.conf}` (private network, no published port, healthcheck, limits)                                                 | Missing ClamAV deployment configuration; verified (and a self-introduced `TCPAddr` bug fixed) |

No business permission, role behavior, parcel/logistics logic or database schema was changed. No new dependencies.

## 3. Prioritized blockers

| Priority | Blocker                                                                                                                                    | Owner                  | Ref                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------------------ |
| P0       | Upgrade `next` (≥ 16.4.1, critical RCE advisories) and address zod/body-parser/multer/xlsx advisories with full regression                 | Engineering            | F-1, F-2, D-13     |
| P0       | API deployment definition (image/process model incl. in-process workers) and ingress restricting `/health/*`, `/system/*`                  | Ops                    | F-4                |
| P0       | Production clamd deployment, monitoring and alert routing                                                                                  | Ops                    | D-6                |
| P0       | Real storage provider: dedicated bucket, scoped IAM, CORS, run provider suite                                                              | Ops/Security           | D-8                |
| P1       | Product decisions: retention, grant holders/expiry, two-person release, ADMIN default permissions                                          | Product/Legal/Security | D-1..D-4           |
| P1       | Load test on staging hardware against approved targets; decide on outbox relay batch/poll changes (realtime lag at > ~8 events/s/instance) | Engineering            | D-9, F-PERF-3      |
| P1       | Backlog rollout plan with real file sizes; announce temporary attachment unavailability                                                    | Product/Ops            | D-5                |
| P2       | Search performance (term-frequency-bound plan)                                                                                             | Engineering            | F-PERF-1           |
| P2       | CSP for the web app; audit DELETE privilege; JWT iss/aud                                                                                   | Security               | F-3, F-5, D-11     |
| P2       | Messenger dialogs focus restore; muted-text contrast; login pre-hydration feedback                                                         | Frontend               | F-A11Y-2/3, F-UX-1 |
| P2       | Run chat integration and browser suites in CI (services for Postgres/Redis/S3/clamd)                                                       | Engineering            | Test gap           |

## 4. Recommended release sequence

1. Dependency patch release (platform-wide regression).
2. Build API deployment artifacts; staging stack with clamd, real non-production bucket, TLS Redis.
3. Product sign-offs (D-1…D-4, D-9, D-10).
4. Staging: verified backup → migrations 0010–0012 with lock guard → backlog scan with real files → provider suite → Playwright (3 browsers) → load profiles → alert drills.
5. Production change approval with staging evidence; maintenance window if the backlog requires it; deploy API then web; 24 h monitoring.

## 5. Distinctions

- **Implemented and verified:** authorization/isolation, internal-note privacy, moderation/evidence, fail-closed malware gate, observability endpoints, Redis-hang resilience, cross-browser UI, restore of chat data.
- **Implemented but not operationally deployed:** ClamAV, metrics/alerts, retention jobs (disabled), grants (no holders).
- **Tested only with emulators/mocks:** object storage (LocalStack), malware INFECTED path in the browser (test double; real clamd verified via adapter smoke test).
- **Awaiting product-owner decision:** D-1…D-5, D-7, D-9, D-10, D-12.
- **Blocked by unavailable credentials/infrastructure:** real storage provider, staging/production, production-like load.
- **Not implemented:** two-person release, configurable outbox batch, CSP, API deployment manifests.

## 6. Workspace

Started from a clean tree at `7b8304b`. No commits, no `git add`, no destructive git commands by me. **External auto-staging observed**: Phase 8 files appear staged in the index. Disposable containers, their anonymous volumes and the ClamAV network were removed at the end. The dhruto dev stack (native PostgreSQL on :5432, `dhruto-redis` on :6379) was not touched. Leftover from an aborted attempt to start the compose Postgres (port 5433 is taken by another project): an empty volume `dhruto_postgres_data` and network `dhruto_default` — removal was blocked by the session's safety check and is left to the owner.
