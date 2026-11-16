# Communication Platform — Phase 8 Operations Runbook

Complements `PHASE-3-OPERATIONS.md` (realtime) and `PHASE-6-OPERATIONS.md` (storage). Never paste tokens, presigned URLs or storage keys into tickets or chat.

## 1. Endpoints

| Endpoint                         | Purpose                                                                                                                                                                                                                                                                  | Exposure      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `GET /health/readiness`          | Routing decision (DB, cache, realtime). Scanner state is deliberately **not** part of readiness: a clamd outage blocks attachments (fail closed) but must not take the API out of rotation.                                                                              | Load balancer |
| `GET /health/realtime`           | Gateway, Redis distribution, presence, counters                                                                                                                                                                                                                          | Internal only |
| `GET /health/chat` (Phase 8)     | `status` ok/degraded; scanner `configured/reachable/engineVersion/signatureVersion/signatureAgeSeconds/signatureStale`; attachments `scanPending/oldestPendingAgeSeconds/infected/failed`; chat outbox `pending/processing/failed/oldestPendingAgeSeconds`. Counts only. | Internal only |
| `GET /health/metrics/prometheus` | Prometheus text: platform RED + pool + queues, plus Phase 8 chat metrics (§2)                                                                                                                                                                                            | Internal only |

All `/health/*` and `/system/*` routes are unauthenticated by design: **restrict them to the internal network at the ingress** (finding F-4).

## 2. Chat metrics (Prometheus)

| Metric                                                             | Type                   | Meaning                                                                                             |
| ------------------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `dhruto_chat_scanner_up`                                           | gauge                  | clamd reachable (PING)                                                                              |
| `dhruto_chat_scanner_configured`                                   | gauge                  | `CHAT_CLAMAV_HOST` set                                                                              |
| `dhruto_chat_scanner_signature_age_seconds`                        | gauge                  | age of loaded signature DB (−1 unknown)                                                             |
| `dhruto_chat_attachments_scan_pending`                             | gauge                  | verified files awaiting a verdict                                                                   |
| `dhruto_chat_attachments_scan_oldest_pending_seconds`              | gauge                  | age of oldest pending file                                                                          |
| `dhruto_chat_attachments_blocked{scan_status}`                     | gauge                  | INFECTED / FAILED counts                                                                            |
| `dhruto_chat_outbox_events{status}`                                | gauge                  | chat outbox PENDING/PROCESSING/FAILED                                                               |
| `dhruto_chat_outbox_oldest_pending_seconds`                        | gauge                  | outbox lag                                                                                          |
| `dhruto_chat_attachment_events_total{event}`                       | counter (per instance) | uploads, rejections, scan outcomes, download denials, cleanup, retention, `scanSkippedUnavailable`  |
| `dhruto_chat_attachment_rejected_total{reason}`                    | counter                | verification rejections by reason                                                                   |
| `dhruto_chat_realtime_ready`, `dhruto_chat_realtime_redis_healthy` | gauge                  | realtime readiness / cross-instance distribution                                                    |
| `dhruto_chat_socket_connections`                                   | gauge                  | sockets on this instance                                                                            |
| `dhruto_chat_realtime_events_total{event}`                         | counter                | connections, rejections, rate-limited, invalid, joins denied, revocations, fan-out delivered/failed |
| `dhruto_chat_fanout_max_latency_ms`                                | gauge                  | max fan-out latency since start                                                                     |

Existing platform metrics cover API errors (`dhruto_http_errors_total`), latency percentiles, DB pool and queues. Not instrumented (gaps): per-endpoint latency histograms, unauthorized-attempt counters per route (only logs + realtime `joins_denied`), escalation/report volume as metrics (available via `GET /chat/admin/metrics`).

## 3. Alerts (proposed thresholds — need approval, D-9)

| Alert                        | Condition                                                                               | Severity        | First action                          |
| ---------------------------- | --------------------------------------------------------------------------------------- | --------------- | ------------------------------------- |
| ClamAV unavailable           | `dhruto_chat_scanner_up == 0` for 5 min (with `configured == 1`)                        | Page            | §4.1                                  |
| Signature DB stale           | `signature_age_seconds > 172800` (48 h) or `== -1` while up                             | Ticket          | §4.2                                  |
| Scan backlog growing         | `scan_oldest_pending_seconds > 900` for 15 min                                          | Page            | §4.3                                  |
| Scan failures                | increase of `attachment_events_total{event="scanFailed"}` > 10 in 15 min                | Ticket          | §4.4                                  |
| Malware detected             | increase of `{event="scanInfected"}` ≥ 1                                                | Notify security | §4.5                                  |
| Outbox backlog               | `dhruto_chat_outbox_oldest_pending_seconds > 60` for 5 min, or `{status="FAILED"} > 0`  | Page            | §4.6                                  |
| Redis unavailable            | `dhruto_chat_realtime_redis_healthy == 0` for 2 min                                     | Page            | `PHASE-3-OPERATIONS.md` §6            |
| Socket failures              | rate of `{event="connections_rejected"}` or `{event="fanout_failed"}` above baseline ×5 | Ticket          | check auth/origin config, Redis       |
| Upload verification failures | rate of `attachment_rejected_total` > baseline ×5                                       | Ticket          | client bug or abuse; check by reason  |
| Cleanup failures             | increase of `{event="storageErrors"}`                                                   | Ticket          | storage credentials/permissions       |
| High API error rate          | `rate(dhruto_http_errors_total)/rate(dhruto_http_requests_total) > 2 %` for 5 min       | Page            | logs by requestId                     |
| DB pool saturation           | `dhruto_db_pool_connections{state="active"} == DB_POOL_MAX` for 2 min                   | Page            | §4.7 (observed under load in Phase 8) |

## 4. Procedures

### 4.1 ClamAV unavailable

Effect: new attachments stay "security check in progress"; nothing becomes downloadable; **no files are marked FAILED** (Phase 8 behavior). Check `docker inspect --format '{{.State.Health.Status}}' dhruto-clamav`, container logs, memory (clamd needs ~1.5–3 GB). Restart clamd; the backlog drains automatically.

### 4.2 Stale signatures

Check freshclam logs and outbound HTTPS to `database.clamav.net`. Signatures are reloaded by clamd without downtime (`ConcurrentDatabaseReload yes`).

### 4.3 Backlog growing

Check §4.1 first. Then throughput: `CHAT_MALWARE_SCAN_BATCH` (20), `CHAT_MALWARE_SCAN_CONCURRENCY` (2, max 8), `CHAT_MALWARE_SCAN_INTERVAL_MS` (15 s); clamd `MaxThreads` (4). Raise concurrency only with clamd capacity. One job scheduler runs cluster-wide.

### 4.4 Scan failures

`GET /chat/admin/attachments?scanStatus=FAILED` (grant `chat.attachment.restricted_access`). `scan_error` explains: `timeout`/`unavailable`/`protocol` → transient (rescan after fixing clamd); `checksum_mismatch`/`object_missing` → integrity problem (object changed or lost; never releasable; investigate storage).

### 4.5 Malware detected

Security reviews the quarantine queue; release only for confirmed false positives (grant `chat.attachment.quarantine_manage`, reason required, audited). Consider reporting the uploader account.

### 4.6 Outbox backlog

Relay polls every `OUTBOX_POLL_MS` (3 s default). Check Redis health (fan-out retries while Redis is down), relay errors in logs, `event_outbox.last_error`. Durable messages are already stored; clients recover with `afterSequence`.

### 4.6a Outbox relay ceiling

Each instance claims at most 25 events every `OUTBOX_POLL_MS` (≈ 8.3 events/s at the 3 s default). Sustained message rates above (instances × 8.3)/s grow realtime lag without loss (measured in Phase 8). Short-term: lower `OUTBOX_POLL_MS` (min 500 ms) or add instances; long-term: configurable batch size (F-PERF-3).

### 4.6b Redis hangs (no replies) vs Redis down

Both now degrade the same way for REST: cache commands time out after 500 ms and the in-memory fallbacks apply (fixed in Phase 8, F-AVAIL-1). Realtime cross-instance delivery pauses and resumes after recovery.

### 4.7 DB pool saturation

Phase 8 load testing saturated `DB_POOL_MAX=20` per instance on a single workstation (pg-pool acquisition timeouts). Scale API instances within Postgres `max_connections`, or raise the pool with matching Postgres capacity; investigate slow queries (search, F-PERF-1).

### 4.8 Grants

`pnpm --filter @dhruto/api chat:grants list|grant|revoke …` (needs DB access; audited). Prefer `--expires-at`. Review quarterly.

## 5. Logging

Access log lines redact the values of `reason`, `q`, `token`, `access_token`, `refresh_token`, `signature`, `x-amz-signature`, `x-amz-credential` (keys stay visible). Scan/cleanup/retention logs carry attachment ids and codes only — never filenames, keys, URLs or content. Verified on a live server in Phase 7/8.
