# Phase 2 — 08 Master TODO Updates (proposals; prior decisions preserved)

## Proposed status changes (verify on implementation, do not pre-mark complete)
- T-SEC-01/02/04/05: `VERIFIED COMPLETE` (Phase 1 + Phase 2 gate 103/103). No change.
- T-SEC-03: `VERIFIED — no action` unless owner requests scheduled rotation (see Q-ROTATION).
- T-FIN-00/T-TST-01: `VERIFIED COMPLETE` for covered suites; remaining suites listed in `04`.

## Proposed new tasks (for owner approval; do not renumber existing IDs)
- T-OBS-01 (P1): fan-out payload repair (D1) + U1/E1 tests. Depends: none. Acceptance: webhooks spec 9/9.
- T-SEED-01 (P1): gate demo seed on non-production (D2) + I2 test.
- T-VAL-01 (P1): assign/bag-add DTOs (D5) + I1 tests.
- T-EXC-01 (P2): exception re-resolve guard (D7).
- T-CANCEL-01 (P1): cancel endpoint, blocked on Q-CANCEL.
- T-RTO-01 (P1): return initiation, blocked on Q-RTO (+ Q-ATTEMPT-CAP for caps).
- T-BULK-01 (P1): bulk build-or-remove, blocked on Q-BULK.
- T-LIT-01 (P2): placeholder literals cleanup (D8).
- T-SCOPE-01 (P2): hub intel/alert scoping, blocked on Q-INTEL-SCOPE.
- T-IDEM-01 (P3): key-length enforcement (D9).

## Roadmap position
Insert Slices A–E (`07`) between roadmap Phase 1 and Phase 2 (nav redesign): fan-out repair restores the notification feedback loop that later work depends on. Original `docs/audit/16-implementation-roadmap.md` phases otherwise unchanged.
