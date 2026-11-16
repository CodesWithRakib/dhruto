# Communication Platform — Phase 8 Load Test Report

**No capacity claim follows from this report.** All runs used one Windows workstation hosting everything (two API instances, PostgreSQL 16, Redis 7, LocalStack, ClamAV and the load generator) inside a Docker VM limited to ~3.8 GiB RAM. Results show behavior and bottlenecks, not production capacity. Targets in §6 are proposals requiring approval (D-9).

## 1. Setup

- Dataset (synthetic, `apps/api/test/load/seed-load.mjs`): 2,000 parcel conversations, 100,000 messages, 6,000 memberships, 2,000 CLEAN attachments.
- Two API instances (A, B) sharing PostgreSQL and the Redis Socket.IO adapter; `DB_POOL_MAX` default (20 per instance); per-user abuse rate limits raised for capacity measurement.
- REST: k6 (`test/load/chat-rest.k6.js`), weighted mix — inbox 30 %, history 25 %, send 15 %, unread 10 %, search 5 %, download authorization 5 %, detail 5 %, admin (inbox/metrics/audit) 5 %; tokens minted with a test-only secret.
- Realtime: `test/load/realtime-load.mjs` (socket.io-client): users split across A/B, 10 % with a second device on the other instance, sends via REST, measures send→socket latency, duplicates, losses, reconnection storm, Redis interruption with REST gap-fill.
- Resources: `test/load/sample-resources.sh` (docker stats, `pg_stat_activity`, Redis INFO, outbox depth).

## 2. REST results

| Profile                | VUs   | Requests | Throughput | Errors | p50    | p95    | p99      | Notes                                                                                                                             |
| ---------------------- | ----- | -------- | ---------- | ------ | ------ | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| baseline (60 s)        | 10    | 6,184    | 103 req/s  | 0 %    | 76 ms  | 186 ms | 416 ms   | Postgres ≤ 183 % CPU, ≤ 36 connections                                                                                            |
| ramp-lite (2.5 min)    | 0→50  | 16,819   | 105 req/s  | 0 %    | 165 ms | 588 ms | 1,259 ms | throughput plateau; Postgres ≤ 339 % CPU                                                                                          |
| sustained-lite (3 min) | 30    | 22,093   | 123 req/s  | 0 %    | 185 ms | 524 ms | 977 ms   | no pool timeouts; API RSS ≈ 225–230 MB after                                                                                      |
| ramp (to 200)          | 0→200 | —        | —          | —      | —      | —      | —        | **aborted**: p95 3 s → 12.3 s and 122 pg-pool acquisition timeouts at ~50–100 VUs, then the Docker VM crashed (environment limit) |

Per-endpoint p95 (sustained-lite): inbox 364 ms, history 343 ms, send 652 ms, unread 286 ms, detail 228 ms, download authorization 270 ms, admin inbox 515 ms, admin metrics 345 ms, admin audit 312 ms, **search 3,681 ms**.

## 3. Realtime results

| Scenario                                                  | Devices                          | Result                                                                                                                                    |
| --------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 100 users, 100 messages (13 msg/s)                        | 110 (10 multi-device, split A/B) | 110/110 delivered, **0 duplicates, 0 lost**; latency p50 3.06 s, p95 4.26 s (dominated by `OUTBOX_POLL_MS` = 3 s)                         |
| Reconnection storm (100 users)                            | 110                              | all reconnected in 0.38 s, 0 errors                                                                                                       |
| 400 users, 400 messages (41 msg/s)                        | 440                              | 440/440 delivered, 0 duplicates, 0 lost; **all delivered 15 s after the last send**; p50 7.8 s, p95 15.4 s                                |
| Reconnection storm (400 users)                            | 440                              | all reconnected in 2.2 s, 0 errors                                                                                                        |
| Redis paused ~10 s during sends (after the F-AVAIL-1 fix) | 440                              | 20 messages sent during the outage; all 40 deliveries arrived after recovery (p95 12.1 s); 0 lost, 0 duplicates; REST gap-fill not needed |
| Multi-instance                                            | A↔B                              | every cross-instance and second-device delivery arrived once                                                                              |

Eventual consistency: realtime delivery is at-least-once and lags the commit by up to one outbox poll plus relay backlog; clients recover with REST `afterSequence`.

## 4. Background jobs

| Job                 | Measurement                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outbox relay        | claims 25 events per poll per instance every 3 s → ceiling ≈ 8.3 events/s/instance (≈ 16.7/s with 2). Measured drain: 400 events ≈ 25 s; after the sustained run 2,700 chat events drained in 149 s (≈ 18/s). Backlog grew without bound while sends (~18/s) exceeded the ceiling. All 7,731 chat events ended PUBLISHED, none FAILED. |
| Malware scan        | ≈ 202 files/min at defaults, ≈ 1,270 files/min at concurrency 4 / batch 40 (real ClamAV, 64 KiB) — `PHASE-8-MIGRATION-ROLLOUT.md` §7                                                                                                                                                                                                   |
| Cleanup / retention | functional tests only (not load-tested)                                                                                                                                                                                                                                                                                                |

## 5. Findings

| ID        | Finding                                                                                                                                                                      | Evidence                                                                                                                                                                                                                                              | Recommendation                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-PERF-1  | Search latency is dominated by the **platform-wide** frequency of the term: the GIN bitmap covers the whole posting list before intersecting with the caller's conversations | `EXPLAIN ANALYZE` (100,000-row bitmap for a common word); common vs rare term 45 ms vs 15 ms sequential, 242 ms vs 80 ms at 10-way concurrency; search p95 0.9–3.7 s under mixed load. Disabling GIN `fastupdate` made it worse (hypothesis rejected) | Evaluate a composite GIN `(conversation_id, tsvector)` via `btree_gin`, or a query that filters the caller's conversations first; benchmark at production volume |
| F-PERF-2  | DB connection pool exhaustion under saturation (`DB_POOL_MAX` 20 per instance)                                                                                               | 122 pg-pool acquisition timeouts in the aborted 200-VU ramp                                                                                                                                                                                           | Size instances × pool against Postgres; alert on pool saturation (runbook)                                                                                       |
| F-PERF-3  | Outbox relay throughput ceiling (25 events / 3 s / instance, batch not configurable) bounds realtime delivery for the whole platform                                         | §3/§4                                                                                                                                                                                                                                                 | Make the batch size configurable and re-poll immediately when a batch was full (platform change, needs approval); alert on outbox lag                            |
| F-AVAIL-1 | A **hung** Redis (TCP open, no replies) stalled every chat REST request > 60 s (the cache client used by the rate limiter had no command timeout)                            | Probe: send/read aborted at 60 s with Redis paused                                                                                                                                                                                                    | **Fixed**: `commandTimeout` 500 ms in `CacheService`; now send 201 in 585 ms / read 200 in 595 ms while Redis hangs; regression test added                       |

## 6. Proposed targets (require approval)

p95 < 300 ms for inbox, history, unread, detail, download authorization; < 500 ms for send and admin queues; < 1,000 ms for search; error rate < 0.1 %; realtime delivery p95 < 5 s at expected peak send rate; outbox lag < 10 s sustained. On this workstation the system met these at 10 VUs except search; at 30–50 VUs Postgres CPU was the bottleneck.

## 7. Not done

Production-like hardware, longer soak (hours), memory-leak analysis, 1,000+ concurrent sockets, presence/typing storms, cleanup jobs under load, per-endpoint server-side histograms.
