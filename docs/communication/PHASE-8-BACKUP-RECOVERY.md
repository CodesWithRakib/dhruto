# Communication Platform — Phase 8 Backup and Recovery

Extends `docs/14-DISASTER-RECOVERY.md` for the communication platform. Frequencies are **proposals** pending approval (D-10).

## 1. What must be backed up

| Asset                        | Contents                                                                                                                                                                              | Proposed frequency                                                                                         | Recoverable from elsewhere?                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| PostgreSQL                   | All chat tables (conversations, participants, messages, attachments metadata + scan state, reports, notes, escalations, grants, **append-only audit**), `event_outbox`, platform data | Continuous WAL archiving (PITR) + daily base backup; meets the platform RPO target only with WAL archiving | **No** — source of truth                                                                                         |
| Object storage (chat bucket) | Attachment bytes under `chat/`                                                                                                                                                        | Bucket versioning + replication or daily snapshot; versioning also protects against accidental deletes     | **No**                                                                                                           |
| Redis                        | BullMQ job schedulers, Socket.IO adapter pub/sub, presence, rate-limit windows                                                                                                        | None required (AOF optional)                                                                               | **Yes** — schedulers re-register at boot; presence/typing are ephemeral; pending outbox work lives in PostgreSQL |
| ClamAV                       | Signature DB (`clamav_db` volume), `deploy/clamav/clamd.conf`                                                                                                                         | Config in git; signatures re-downloaded by freshclam                                                       | **Yes** (first start downloads ~300 MB)                                                                          |
| Environment configuration    | API/web env vars, CORS origins, storage/clamd settings                                                                                                                                | Secret manager with versioning                                                                             | Must be restorable from the secret manager — never from git                                                      |

## 2. Dependencies between records and objects

`chat_attachments.storage_key` ↔ object `chat/<conversation>/<attachment>`. A database backup and an object-storage backup taken at different times diverge:

- **Rows without objects** (DB newer than objects): downloads fail; moderation evidence may be lost. Detect with `apps/api/test/recovery/chat-storage-consistency.mjs` (`missingObjects`, exit code 2).
- **Objects without rows** (objects newer than DB): harmless orphans; the cleanup job removes them after the pending TTL.
- Scan verdicts are bound to `checksum_sha256`; a restored object with different bytes fails the integrity check (`checksum_mismatch`) and is never served.

## 3. Recovery order

1. Restore PostgreSQL (PITR to the incident time).
2. Restore object storage to the same point (versioning) **before** starting API instances.
3. Run `chat-storage-consistency.mjs` (read-only) and `test/recovery/chat-restore-checks.sql` against the restored DB.
4. Start Redis (empty is acceptable), then clamd, then API instances (schedulers re-register; outbox relay resumes; clients gap-fill with `afterSequence`).
5. Verify `/health/readiness`, `/health/chat`, a test upload → CLEAN → download, and realtime delivery.

## 4. Restore drill executed in Phase 8 (disposable environment)

Source: the isolated E2E database after all browser runs (19 conversations, 41 messages, 16 attachments, 3 reports, 3 notes, 195 audit rows, 2 grants, 79 outbox events).

| Step                             | Command (inside the disposable Postgres 16 container)              | Result                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backup                           | `pg_dump -U postgres -F c -Z 6 -f /tmp/p8.dump dhruto_p8_e2e_test` | 2 s, 350 KB, SHA-256 recorded                                                                                                                                                                                                      |
| Restore                          | `createdb dhruto_p8_restore_test` + `pg_restore --no-owner`        | 5 s                                                                                                                                                                                                                                |
| Row counts                       | 11 tables compared (all chat tables, outbox, users, parcels)       | **All match**                                                                                                                                                                                                                      |
| Integrity                        | `test/recovery/chat-restore-checks.sql`                            | **9/9 ok**: migrations 0010–0012, gap-free sequences = counters, cursor bounds, attachment/report/note references, CLEAN verdicts bound to checksums, audit trigger present, no outbox rows stuck in PROCESSING, grant constraints |
| Audit immutability after restore | UPDATE attempt                                                     | Rejected ("append-only")                                                                                                                                                                                                           |
| Object consistency               | `chat-storage-consistency.mjs`                                     | 16 rows / 16 objects, 0 missing; after deleting one object on purpose: `missingObjects: 1`, exit 2 (detector works)                                                                                                                |

Not executed: PITR/WAL replay, object-storage versioned restore on a real provider, a full-size restore (timing at production volume), and the platform scripts `scripts/backup-db.mjs` / `restore-db.mjs` themselves (they need host `pg_dump`/`psql`, and `restore-db.mjs` ignores `DATABASE_URL` and defaults to `localhost:5432` before `DROP DATABASE` — finding F-6).

## 5. What cannot be recovered

Messages and audit rows written after the last WAL archived (RPO window); attachment bytes without versioning/backups; presence/typing state (by design); BullMQ job history (not needed).
