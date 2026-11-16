# Communication Platform — Phase 8 Product Decision Register

Decisions that block production. None was made on the product owner's behalf; current behavior is the safe default unless stated.

| #    | Decision                                   | Blocks production?            |
| ---- | ------------------------------------------ | ----------------------------- |
| D-1  | Retention periods                          | Yes                           |
| D-2  | Grant ownership and expiry                 | Yes                           |
| D-3  | Two-person approval for attachment release | Yes (policy)                  |
| D-4  | ADMIN default permission policy            | Yes (policy)                  |
| D-5  | Existing attachment backlog rollout        | Yes                           |
| D-6  | ClamAV deployment and monitoring ownership | Yes                           |
| D-7  | API breaking-change rollout                | Yes                           |
| D-8  | Storage provider and bucket configuration  | Yes                           |
| D-9  | Performance targets                        | Yes                           |
| D-10 | Backup and recovery expectations           | Yes                           |
| D-11 | JWT issuer/audience claims                 | No (recommended)              |
| D-12 | Content-Security-Policy for the web app    | Recommended before production |
| D-13 | Dependency upgrades (Next.js, zod, others) | Yes (security)                |

---

## D-1 Retention periods

- **Current:** expired pending uploads 1 h, unsent 24 h, rejected 7 d (Phase 6). Deleted-message and quarantined objects: retained indefinitely (purge disabled). Messages, reports, notes, audit: retained indefinitely. Evidence hold (open report / active escalation) always blocks purges.
- **Options:** (a) keep indefinite; (b) fixed periods per category (e.g. deleted-message objects N days, quarantine M days); (c) legal-hold-driven only.
- **Security:** longer retention keeps evidence but increases breach impact; shorter retention can destroy evidence.
- **Operational:** storage cost grows without purges; purge jobs exist and are tested but disabled.
- **Recommended:** (b) with periods set by legal/compliance; keep audit ≥ the longest evidence period. Settings: `CHAT_DELETED_MESSAGE_ATTACHMENT_RETENTION_SECONDS`, `CHAT_QUARANTINED_ATTACHMENT_RETENTION_SECONDS`.
- **Approver:** Legal/compliance + product owner. **Blocked:** destructive retention stays disabled.

## D-2 Grant ownership and expiry

- **Current:** three grant-required permissions; grants via operator CLI; optional `--expires-at`; no grant holders exist anywhere outside tests.
- **Options:** named security officers with 90-day expiring grants; on-call rotation grants (7 days); indefinite grants.
- **Security:** expiring grants limit standing privilege. **Operational:** needs a renewal procedure.
- **Recommended:** expiring grants for named people, renewal through a ticket referenced in `--operator`; quarterly review of `chat_staff_grants`.
- **Approver:** Security lead + operations manager. **Blocked:** without holders nobody can review quarantined files or retention.

## D-3 Two-person approval for release

- **Current:** one granted staff member + reason + audit releases an INFECTED/FAILED file (integrity failures can never be released).
- **Options:** keep single approver; require second approver (new workflow, not built).
- **Security:** single approver can release malware by mistake or intent. **Operational:** two-person needs a second available holder.
- **Recommended:** decide based on expected volume; if two-person is required, it is new development.
- **Approver:** Security lead. **Blocked:** policy only.

## D-4 ADMIN default permission policy

- **Current:** every ADMIN holds every non-grant-required chat permission platform-wide (view any conversation with reason, intervene, moderate, export, audit view, escalation, reports). Reads are reason-gated and audited, not prevented. Matrix: `PHASE-8-SECURITY-ASSESSMENT.md` §2.
- **Options:** (a) keep; (b) make `CONVERSATION_EXPORT`, `AUDIT_VIEW`, `CONVERSATION_VIEW_RESTRICTED` grant-required (code change limited to `CHAT_GRANT_REQUIRED_PERMISSIONS` + migration CHECK list); (c) introduce narrower staff roles (auth change).
- **Recommended:** (b) — small, uses the existing grant model.
- **Approver:** Product owner + security lead (authorization change). **Blocked:** policy.

## D-5 Existing attachment backlog

- **Current:** migration 0012 sets every existing attachment to `PENDING`; nothing downloadable until scanned. Job: batch 20, concurrency 2 (configurable), interval 15 s, outage-safe (no claims while clamd is unreachable).
- **Options:** scan everything after migration (attachments unavailable for the duration); run 0012 + backlog scan in staging first to measure; time the migration for a low-traffic window.
- **Recommended:** measure backlog throughput on staging with real clamd and the real bucket (synthetic measurement in `PHASE-8-MIGRATION-ROLLOUT.md`), announce temporary attachment unavailability.
- **Approver:** Product owner + operations. **Blocked:** yes.

## D-6 ClamAV deployment and monitoring ownership

- **Current:** reference deployment `deploy/clamav/` verified locally (private network, healthcheck, signature updates). No production deployment.
- **Recommended:** operations owns clamd and freshclam; alerts per `PHASE-8-OPERATIONS-RUNBOOK.md`.
- **Approver:** Operations lead. **Blocked:** yes (without clamd every attachment stays blocked).

## D-7 API breaking-change rollout

- **Current:** both breaking behaviors are enforced; all in-repo clients updated (compatibility doc). No external API consumers of these endpoints were found.
- **Recommended:** ship API and web together; no compatibility shim (would weaken security).
- **Approver:** Product owner. **Blocked:** only by release coordination.

## D-8 Storage provider and bucket

- **Current:** LocalStack only. Provider suite ready (`apps/api/test/chat-storage-provider.e2e-spec.ts`).
- **Needed:** provider choice, a dedicated non-production bucket, scoped credentials, allowed web origin.
- **Approver:** Operations + security. **Blocked:** yes.

## D-9 Performance targets

- **Current:** no approved targets. Measured on one workstation (not production hardware): `PHASE-8-LOAD-TEST-REPORT.md`.
- **Proposed (for approval):** p95 < 300 ms for inbox/history/send, < 500 ms for search; error rate < 0.1 %; realtime delivery p95 < 4 s with the default outbox poll (3 s).
- **Approver:** Product owner + engineering lead. **Blocked:** yes (no capacity claim can be made).

## D-10 Backup and recovery expectations

- **Current:** existing DR doc states RPO < 15 min / RTO < 30 min (unverified for chat). Phase 8 restore drill of chat data passed on a disposable database.
- **Needed:** approved RPO/RTO for chat, object-storage versioning/backup decision, restore-test cadence.
- **Approver:** Operations + product owner. **Blocked:** yes.

## D-11 JWT issuer/audience (platform-wide)

Current tokens carry no `iss`/`aud`. Adding them is an authentication change needing approval. Not chat-specific.

## D-12 Content-Security-Policy

The web app sends no CSP. Recommended: a policy allowing self, the API origin (`connect-src`, WebSocket), and the storage origin (`img-src`, `media-src`, `connect-src`). Start in report-only mode in staging. Affects the whole web app → owner decision.

## D-13 Dependency upgrades

`next@16.3.8` is in the vulnerable range of two critical advisories (patched ≥ 16.4.1); `zod@3.25.76` high (patched only in 4.x, a major migration); also body-parser, multer, xlsx, qs, glob, minimatch, js-yaml. Requires a platform-wide upgrade and regression. **Approver:** engineering lead. **Blocked:** yes.
