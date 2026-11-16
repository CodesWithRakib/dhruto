# Communication Platform — Phase 8 Migration and Rollout Plan

Migrations 0010–0012 have been applied **only** to disposable databases (in Phase 8: `dhruto_p8_*_test`). This plan is for a future controlled environment. It does not authorize applying them anywhere.

## 1. Dependency order

`…0009` (platform) → `1700000000010-CommunicationPhase1Foundation` → `1700000000011-CommunicationPhase2Backend` → `1700000000012-CommunicationPhase7AdminCenter`. The runner (`node dist/database/migrate-cli.js run`) applies them in order from `dist/database/migrations/*.js`. Each is idempotent (`IF NOT EXISTS` / guarded) and additive.

## 2. Pre-deployment checks

1. Fresh **verified** backup (restore-tested, `PHASE-8-BACKUP-RECOVERY.md`); object-storage versioning on.
2. `SELECT name FROM migrations ORDER BY id DESC LIMIT 3;` — confirm the starting point.
3. The `delivery_otp_code` schema drift is resolved by an approved platform change (otherwise seeding and some platform flows fail on migration-built databases; unrelated to chat).
4. `uuid_generate_v4()` available (uuid-ossp, as for earlier migrations).
5. Lock-wait guard for the session running migrations: `SET lock_timeout = '5s'` (retry on timeout rather than queueing behind long transactions).
6. Low-traffic window if `chat_conversations` / `chat_attachments` are large (see §4).
7. clamd deployed and healthy **before** 0012 (otherwise every attachment stays blocked after it).

## 3. Expected changes

| Migration | Objects                                                                                                                                                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0010      | 11 chat tables (+ `chat_staff_grants` comes in 0012), 10 enum types, FKs (RESTRICT/CASCADE/SET NULL), CHECKs, indexes, audit immutability trigger                                                                                                                                                                                                            |
| 0011      | 3 audit enum values; GIN FTS index on `chat_messages`; listing indexes; audit timeline index                                                                                                                                                                                                                                                                 |
| 0012      | 9 audit enum values; 2 enum types; escalation columns + 2 FKs + 2 CHECKs + 2 partial indexes + expression index on `chat_conversations`; 10 scan/retention columns + 3 CHECKs + 3 indexes on `chat_attachments`; report-by-conversation index; `chat_staff_grants` table + unique partial index. **All existing attachments get `scan_status = 'PENDING'`.** |

## 4. Locking and duration (rehearsed in Phase 8)

Rehearsal on a disposable PostgreSQL 16 (Docker on a Windows workstation, slower I/O than a production host) at 0011 level with **50,000 conversations and 150,000 attachments** (196 MB), migrated with the production CLI while a probe issued point reads and writes every 100 ms:

| Step            | Wall time (incl. ~6 s CLI/Nest bootstrap) | Worst blocking observed                                                                                 |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 0012 `up`       | 9.96 s                                    | conversation read 694 ms, conversation write 383 ms, attachment read 183 ms (idle baseline max ≈ 35 ms) |
| 0012 `down`     | 6.13 s                                    | not probed; rows preserved (150,000), columns dropped                                                   |
| 0012 `up` again | 6.11 s                                    | all 8 indexes and 7 constraints present                                                                 |

Interpretation: adding CHECK/FK constraints validates rows under an ACCESS EXCLUSIVE lock and index builds take SHARE locks; at this size the stall is under a second. Cost grows roughly linearly with table size. **For tables an order of magnitude larger, pre-create the 0012 indexes with `CREATE INDEX CONCURRENTLY` and add constraints `NOT VALID` followed by `VALIDATE CONSTRAINT`** (the migration's `IF NOT EXISTS` guards then skip them). This was not rehearsed at larger sizes.

## 5. Verification queries (after each migration)

```sql
SELECT name FROM migrations WHERE name LIKE 'Communication%' ORDER BY id;              -- 3 rows after 0012
SELECT count(*) FROM pg_indexes WHERE indexname IN ('IDX_chat_conversations_activity','IDX_chat_attachments_scan_pending',
  'IDX_chat_attachments_scan_blocked','IDX_chat_reports_conversation_status','IDX_chat_conversations_escalation',
  'UQ_chat_staff_grants_active','IDX_chat_attachments_conversation_created','IDX_chat_conversations_escalation_assignee'); -- 8
SELECT scan_status, count(*) FROM chat_attachments GROUP BY 1;                          -- all PENDING right after 0012
SELECT count(*) FROM chat_audit_logs;                                                    -- unchanged by the migration
```

Then run `apps/api/test/recovery/chat-restore-checks.sql` (all `ok = true`).

## 6. Rollback

Forward-fix preferred. `down` of 0012 drops escalation state, scan results and grants (data loss limited to Phase 7 features; downloads would no longer be scan-gated by older code — a security decision). `down` of 0010 destroys all chat data — only with a fresh backup and explicit approval.

## 7. Existing-attachment backlog

**Behavior:** after 0012 every existing attachment is `PENDING`, so participants see "security check in progress" until the scan job reaches it. No file is ever served before a CLEAN verdict bound to its checksum.

**Controls (implemented and tested):**

| Requirement              | Mechanism                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded batches          | `CHAT_MALWARE_SCAN_BATCH` (default 20) rows claimed per run                                                                             |
| Configurable concurrency | `CHAT_MALWARE_SCAN_CONCURRENCY` (default 2, max 8) parallel scans within a batch (Phase 8)                                              |
| Backpressure             | One cluster-wide BullMQ job scheduler, concurrency 1; next run only after the previous finishes (`CHAT_MALWARE_SCAN_INTERVAL_MS`, 15 s) |
| Rate limit on clamd      | batch × concurrency bounds simultaneous INSTREAM sessions; clamd `MaxThreads 4`, `MaxQueue 50`                                          |
| Retry policy             | exponential backoff per file, then FAILED; **no attempts consumed while clamd is unreachable** (Phase 8)                                |
| Progress metrics         | `dhruto_chat_attachments_scan_pending`, `…_scan_oldest_pending_seconds`, `/health/chat`                                                 |
| Failed-item reporting    | `GET /chat/admin/attachments?scanStatus=FAILED` (grant) with `scan_error`                                                               |
| Safe restart             | claims carry a lease (`CHAT_MALWARE_SCAN_LEASE_SECONDS`, 300 s); crashed claims are reclaimed after it                                  |
| No duplicate scans       | only `PENDING` rows are claimed (`FOR UPDATE SKIP LOCKED`); CLEAN rows with a checksum-bound verdict are never re-claimed               |

**Tested (synthetic, disposable):** integration — 50-row backlog in ≤ 20-row batches, 5 leased "crashed" rows not reclaimed early and finished after lease expiry, an existing CLEAN row never rescanned, every file scanned exactly once; three concurrent runs → no duplicates.

**Throughput against a real clamd (ClamAV 1.4.6, 64 KiB files, measured from verdict timestamps):**

| Settings                                        | Files | Scan span | Throughput        |
| ----------------------------------------------- | ----- | --------- | ----------------- |
| defaults: concurrency 2, batch 20, interval 2 s | 300   | 88.9 s    | ≈ 202 files/min   |
| concurrency 4, batch 40, interval 2 s           | 300   | 14.2 s    | ≈ 1,270 files/min |

Indicative only (workstation; larger real files scan slower). Example: 150,000 files ≈ 12 h at defaults vs ≈ 2 h at concurrency 4. Measure on staging with production-like file sizes before choosing settings (D-5).
