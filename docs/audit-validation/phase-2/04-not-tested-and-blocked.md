# Phase 2 — 04 Not Tested & Blocked

## NOT_TESTED (unit/e2e gaps; file refs, no execution claimed)
- Cancel flow (no endpoint; matrix-only spec `lifecycle.spec:94-104`).
- Return/RTO initiation, return fees, auto-escalation (no implementation).
- Raw-body 422 cases (assign/bag-add); re-resolve 409; key-length bounds.
- Delivery-attempt cap behavior (no implementation).
- Photo-proof validation (optional today).
- Suspend/activate admin API (no endpoint found).
- `riders/me` scan-200-then-find inefficiency (`analytics.controller.ts:530` `void riderId`) — perf, not correctness.
- Hub-scoped intelligence/alerts (leak untested).
- Live Redis-down transport drill (fallbacks VERIFIED by code only); multi-instance limiter (stub-tested only).
- Frontend Playwright suites (not run in Phase 2; backend-only scope).
- Remaining suites from full inventory not rerun in Phase 2: `parcels-cursor`, `riders`, `auth` (covered via rework), `notifications-webhooks` (1 known red), `intelligence*`, `analytics`, `observability`, `scale-concurrency`, all web unit/e2e.

## BLOCKED (infrastructure unavailable)
- Real SMS/email provider paths (no provider keys configured; log mode only) — cannot verify HTTP transport against live gateway (nor should we in audit).
- Live Upstash Redis behavior (localhost down; hosted URL configured but not exercised deliberately).
- Production-parity deploy (no Dockerfiles/K8s; `output:standalone` only).
- Load targets (`250RPS p95<300ms`) — no harness.

## Explicitly NOT re-run (rely on Phase 0/1 evidence)
- `finance-ledger`/`finance` full invariants (green in gate rerun §2 — actually re-run: 22/22 in gate; listed here for completeness as covered).
