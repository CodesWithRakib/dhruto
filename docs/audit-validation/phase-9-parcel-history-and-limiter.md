# Phase 9 — Parcel-List History/Deep-Link Spec + Multi-Instance Limiter Spec

> Per owner instruction, no commands were executed against any environment for
> this phase: no servers started, no test runs, no builds. All changes below
> are code + docs only. Anything marked PENDING is an owner-run verification,
> not a code gap.

## 1. Back/forward/share-link cases (`parcel-list.spec.ts`, +3 tests)

Filter commits use `router.replace` (`hooks/use-query-state.ts`), so each
filter set replaces one history entry — there is deliberately no history entry
per keystroke. The spec covers the three flows this architecture supports:

1. **Details → Back preserves the filtered list** — search, open the row's
   View link, `goBack()`; the list URL still carries `search=`, the field
   still holds the name, and the row is visible again.
2. **Share-link deep-link adopts filters on cold load** — capture the filtered
   URL (`search=` + `status=CREATED`), open it in a fresh page with no prior
   field state; the adopt effect restores the searchbox value, the Created
   toggle reads `aria-pressed="true"`, and the row renders.
3. **Reload preserves filters** — same assertions after `page.reload()`.

No app code changed: the Phase 8 commit guard already leaves these flows
untouched (adopt pulls URL→field, debounce follows, commit is a no-op on
equality). PENDING: Brave run of the full `parcel-list` journey (5 tests).

## 2. Multi-instance limiter spec (`rate-limit-multi-instance.e2e-spec.ts`, NEW)

Two in-process Nest applications share the one configured Redis (Upstash in
development). Probe choice: `GET /api/v1/tracking/:code` — public (no auth),
read-only (unknown codes 404 with zero writes), cheap, `60/min` per identity
(scope `tracking`).

- 70 lookups alternate across both instances under one TEST-NET-2
  `x-forwarded-for` identity (fresh 60s window every run; shared Upstash
  counters persist across reruns — see Phase 6 report).
- Expected: exactly 60 passes (all 404, asserted side-effect-free) + 10 × 429
  with `Retry-After` + `RATE_LIMIT_EXCEEDED`. Per-instance counters would let
  all 70 through and fail the spec.
- The spec fails fast with a descriptive message when Redis is unreachable
  (memory fallback is per-instance by design, so sharing cannot hold there).

PENDING: run (`vitest run rate-limit-multi-instance`) against a seeded DB with
shared Redis reachable; single-file run recommended (60s windows are
per-identity, but isolation keeps it deterministic).

## 3. Environment note

`dhruto_phase9` was dropped + recreated + migrated (10/10) + seeded
(37 parcels, standard seed counts) earlier in this session, before the
no-testing instruction arrived. No server has been started against it since;
two briefly-started API processes were killed. The DB is a clean slate for
the owner-run verifications above.

## Regression status

- No app behavior changed in this phase (2 spec files only), so no regression
  surface exists beyond the new specs themselves.
- Nothing was executed: no typecheck/lint/build/unit/e2e runs per instruction.
  First green run of both specs is owed and tracked in the master TODO.

## Deferred (unchanged)

Owner-run Brave parcel-list journey (5 tests); owner-run multi-instance spec;
Q-BULK async jobs; auto-RTO; scan-mapping; photo/duty/onboarding/rotation/
money-schedule; load targets (`250RPS p95<300ms`); Redis-down drill.

## Next-phase preview (Phase 10 candidates)

1. **Execute the Phase 9 backlog** — Brave parcel-list journey + multi-instance
   spec on the fresh `dhruto_phase9` DB; record results here and in the
   master TODO.
2. **Load baseline** — `scripts/load-baseline.mjs` against staging-like env;
   `250RPS p95<300ms` parcel-list target (`docs/audit/pagination/parcel-list.md`
   §14); `EXPLAIN` + cursor-index verification (T-QRY-06).
3. **Resilience drills** — Redis-down limiter assertion (T-OPS-03), backup/
   restore test (MVP gate), `metrics/prometheus` gating (T-OPS-02).
4. **Bulk async path** — >500-row job decision (Q-BULK remainder) once the
   transactional core + verification backlog is fully green.
