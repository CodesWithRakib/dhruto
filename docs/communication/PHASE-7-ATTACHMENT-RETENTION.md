# Communication Platform — Phase 7 Attachment Scanning and Retention

## 1. Lifecycle with the malware gate

```
reserve → PENDING ─complete(verified)→ UPLOADED + scan PENDING ─scan clean→ UPLOADED + CLEAN  (downloadable)
                                              │                 ├─malware──→ INFECTED (quarantined, blocked)
                                              │                 ├─scanner errors × N → FAILED (blocked)
                                              │                 └─object missing / bytes changed → FAILED (integrity, blocked)
                                              └─ send allowed while PENDING; recipients see "security check in progress"
INFECTED/FAILED ─staff RELEASE (grant + reason; never for integrity failures)→ CLEAN (engine "manual-release")
INFECTED/FAILED/PENDING ─staff RESCAN (grant + reason)→ PENDING (fresh retry budget)
```

Columns (migration 0012, `chat_attachments`): `scan_status` (default `PENDING`), `scan_attempts`, `scan_next_attempt_at`, `scanned_at`, `scanned_sha256`, `scan_engine`, `scan_threat`, `scan_error`, `quarantined_at`, `object_purged_at`.

## 2. Scanning

| Requirement                         | Implementation                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unscanned ≠ safe                    | `chatAttachmentServeDecision` (contracts): only `UPLOADED ∧ CLEAN ∧ object present` is served. Existing rows default to `PENDING` on migration.                                                                                                                                 |
| Result bound to the exact object    | The scanner reads the object once while the job hashes the same bytes; a verdict counts only if the hash equals the verified `checksum_sha256`. DB CHECK `CHK_chat_attachments_scan_binding` (`scanned_sha256` = `checksum_sha256`). Mismatch → `FAILED` / `checksum_mismatch`. |
| Pending / failed never downloadable | Participant download returns 409 `CHAT_ATTACHMENT_SCAN_PENDING` / `CHAT_ATTACHMENT_BLOCKED` (only after membership checks; outsiders still get 404).                                                                                                                            |
| Malicious → quarantined             | `INFECTED` + `quarantined_at` + `scan_threat`; audit `ATTACHMENT_QUARANTINED` (system actor). Cannot be sent if still unsent.                                                                                                                                                   |
| Scanner failure fails closed        | Adapter errors (unreachable, timeout, protocol, size limit) are `error` verdicts → retry with exponential backoff (`CHAT_MALWARE_SCAN_RETRY_BASE_SECONDS` × 2ⁿ, ≤ 1 h), then `FAILED` after `CHAT_MALWARE_SCAN_MAX_ATTEMPTS`. Never `CLEAN`.                                    |
| No scanner configured               | No adapter, no fallback: nothing is claimed, files stay `PENDING` (blocked); a warning is logged once and the retention view shows "no scanner configured".                                                                                                                     |
| Safe retries / concurrency          | Claim = `UPDATE … attempts+1, next_attempt = now+lease … FOR UPDATE SKIP LOCKED`; verdict writes conditional on `scan_status='PENDING' AND scan_attempts=<claimed>` so a stale worker never overwrites a staff decision. Lease expiry recovers crashed workers.                 |
| Observable                          | Counters `scanClean/scanInfected/scanErrors/scanFailed/scanRuns/downloadScanPending/downloadBlocked`; logs `chat.attachment.scan* attachment=<id> code=<code>` (no filenames, keys or URLs).                                                                                    |
| Infrastructure                      | Existing BullMQ/Redis (one cluster-wide job scheduler `chat-attachment-scan`, every `CHAT_MALWARE_SCAN_INTERVAL_MS`, default 15 s) and the existing storage port. No new service.                                                                                               |

**Adapter:** `ClamAvScanner` speaks clamd's documented `zINSTREAM` protocol over TCP (`CHAT_CLAMAV_HOST`, `CHAT_CLAMAV_PORT` = 3310, `CHAT_CLAMAV_TIMEOUT_MS` = 30000). Deploy clamd (e.g. the official `clamav/clamav` image with `StreamMaxLength` ≥ 25 MB) next to the API, reachable on a private network only. Signature freshness (`freshclam`) is an operational responsibility. Tests use a test-only protocol stand-in (`apps/api/test/utils/fake-clamd.ts`) that flags the EICAR test string; it is **not** protection.

## 3. Staff access to restricted content

| Action                           | Requirement                                                                                      | Audit                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Conversation attachment metadata | `view_any` + reason                                                                              | `ADMIN_CONVERSATION_VIEWED` (attachments)                                    |
| Quarantine queue (metadata)      | grant `chat.attachment.restricted_access`                                                        | `ATTACHMENT_RESTRICTED_ACCESSED` (queue)                                     |
| Download restricted content      | same grant + reason; always `attachment`; non-clean content served as `application/octet-stream` | `ATTACHMENT_RESTRICTED_ACCESSED` before the URL is issued (URL never logged) |
| Release / rescan                 | grant `chat.attachment.quarantine_manage` + reason                                               | `ATTACHMENT_RELEASED` / `ATTACHMENT_RESCAN_REQUESTED`                        |

## 4. Retention policy

All durations are **configuration**, not legal decisions. Unset = retained indefinitely.

| Category                                 | Object                                                          | Row                           | Setting (default)                                                                                |
| ---------------------------------------- | --------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Expired pending upload                   | deleted                                                         | deleted                       | `CHAT_PENDING_UPLOAD_TTL_SECONDS` (1 h) — Phase 6                                                |
| Uploaded, never sent                     | deleted                                                         | deleted                       | `CHAT_UNSENT_ATTACHMENT_TTL_SECONDS` (24 h) — Phase 6                                            |
| Rejected (verification)                  | deleted at rejection                                            | deleted after retention       | `CHAT_REJECTED_ATTACHMENT_RETENTION_SECONDS` (7 d) — Phase 6                                     |
| Orphaned storage object                  | deleted when older than the pending TTL                         | —                             | Phase 6 sweep                                                                                    |
| **Deleted-message attachment**           | deleted after the period, unless evidence hold                  | **kept** (`object_purged_at`) | `CHAT_DELETED_MESSAGE_ATTACHMENT_RETENTION_SECONDS` (**unset**, min 1 day)                       |
| **Quarantined (INFECTED/FAILED), sent**  | deleted after the period since quarantine, unless evidence hold | **kept**                      | `CHAT_QUARANTINED_ATTACHMENT_RETENTION_SECONDS` (**unset**, min 1 day)                           |
| Quarantined, unsent                      | covered by the unsent rule above                                | deleted                       | —                                                                                                |
| Moderation evidence                      | **never purged while held**                                     | kept                          | Evidence hold: open/under-review report on the message, or active escalation on the conversation |
| Message rows, audit rows, reports, notes | n/a                                                             | never purged by Phase 7       | Requires a separate, approved policy                                                             |

**Safety:** retention claims rows by setting `object_purged_at` together with a system `ATTACHMENT_OBJECT_PURGED` audit row in one committed transaction (`FOR UPDATE SKIP LOCKED`, bounded batch), then deletes the object; if the delete fails the claim is undone so the next run retries. Objects referenced by non-deleted messages are never selected. Runs inside the existing cleanup job. Status (`GET /chat/admin/retention`, grant `chat.retention.manage`) shows configured periods and bounded eligible counts.

## 5. Product decisions required before production

1. Retention period for attachments of deleted messages (legal/compliance owner).
2. Retention period for quarantined files and whether security wants copies exported before purge.
3. Whether released (false-positive) files need two-person approval (today: one granted staff member + reason + audit).
4. Who holds the three grant-required permissions, for how long (`--expires-at`), and the review cadence.
5. Retention of message content, audit logs and reports (not covered by Phase 7).
6. clamd deployment, signature update monitoring and alerting on `scanFailed` / growing `scanPending`.
