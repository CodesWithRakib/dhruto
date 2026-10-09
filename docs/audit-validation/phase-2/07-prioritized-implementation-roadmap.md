# Phase 2 — 07 Prioritized Implementation Roadmap (small reviewable slices; nothing implemented yet)

## Slice A — Fan-out repair (P1, depends: none; needs Q-RTO only for RETURNED scope)
- A1 Merge `meta.merchantId` + `aggregateId` into outbox payload in `DomainEventPublisher.publish` + backfill missing template fields per event (D1). Acceptance: U1 new tests green; `notifications-webhooks` 9/9; 0 `parcel.created` rows without deliveries on fresh seed.
- A2 Gate demo seed on non-production (D2). Acceptance: I2 green; dev/CI seeding unchanged.
- Regression: R1–R5. Risk: payload shape change — consumers are only relay/templates (verified); webhook `data` envelope gains fields (additive).

## Slice B — Input validation hardening (P1, depends: none)
- B1 `AssignRiderDto` + wire `AddParcelToBagDto` (D5) + 422 tests (I1). B2 Re-resolve guard (D7) + test. B3 Key-length enforcement (D9) + test.
- Regression: R2–R5.

## Slice C — Cancel & return policy (P1, depends: Q-CANCEL, Q-RTO, Q-ATTEMPT-CAP)
- C1 Cancel endpoint per policy (D4) + matrix tests (I3). C2 Return initiation + publishers + idempotency (D6) + I4/E2. C3 Attempt-cap/auto-RTO if decided.
- Regression: R1–R5 + lifecycle spec.

## Slice D — Placeholder & scope cleanup (P2, depends: Q-INTEL-SCOPE, Q-MONEY timing)
- D1 `activeRiders/Hubs`, `bottlenecks`, hero statics → live or removed (D8). D2 Hub-scope intel/alerts. D3 Minor-unit unification (T-FIN-01).
- Regression: R5 + analytics e2e.

## Slice E — Bulk decision (depends: Q-BULK)
- Build (XL: validate→import job + report + E3) or delete nav (S). Standalone slice by design.

## Ordering: A → B → (C after decisions) → D → E. Each slice merges only with R-suites green. F-OBS-01 (A1) first: it restores the feedback loop (webhooks/notifications) every later slice's tests rely on.
