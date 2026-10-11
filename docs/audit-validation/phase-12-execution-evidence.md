# Phase 12 — Execution Evidence (rule lifted for this phase)

Environment: fresh `dhruto_phase9` (drop/create + 10/10 migrations + seed:
37 parcels), API `dist` rebuilt (includes Phase 11), 2 API instances
(:4000/:4001, shared Upstash Redis), web dev (:5000), Brave binary.
All started processes killed after; scratch `dhruto_restore_test` dropped.

## 1. Limiter specs — BOTH PASS

- `rate-limit-multi-instance.e2e-spec.ts`: **1/1 pass** (15.2s). 70 tracking
  lookups split across 2 in-process instances under one identity → exactly
  60 passes (all 404, side-effect-free) + 10 × 429 with `Retry-After` +
  `RATE_LIMIT_EXCEEDED`. Shared counter proven live; per-instance counters
  would have allowed all 70.
- `rate-limit-redis-down.e2e-spec.ts`: **1/1 pass** (7.6s). Dead-loopback
  boot asserted `memory-fallback` driver; 61 sequential lookups → 60×404 +
  1×429 with `Retry-After` + code. Protection stays ON with Redis down
  (T-OPS-03 drill evidence).

## 2. Brave parcel-list journey — 5/5 PASS (F-UI-01 closed in Brave)

**But it failed first — twice — and the diagnosis is the real finding.**

`clear-filters restores results` failed deterministically while back /
share-link / reload / pagination passed. Instrumented probe (state poll +
React logs, all reverted after) proved a two-defect chain:

1. **Input↔hook ring oscillator** (`components/search-input.tsx`):
   `DebouncedSearchInput` keeps internal `text` + 0ms `debounced` and emits
   `if (debounced !== value) onChange(debounced)`. After an external reset,
   the same commit renders with stale-but-agreeing `text`/`debounced` vs the
   new `value` → emits the cleared text upward → parent flips → syncs back →
   roles reverse next render. Measured: **355 emissions in 12s**, input/hook
   anti-synced, ending in repeated **"Maximum update depth exceeded"**.
   Phase 8's commit guard held (0 commit writes) but couldn't stop the
   input-level pump.
2. **Single resurrection** (after the oscillator was understood): the
   first-gate fix (`debounced === text`) still emitted once in the reset
   commit (stale trio agreeing) → hook "NOPE" → commit legitimately wrote
   `?search=NOPE` back (status correctly stayed gone).

**Fix** (`search-input.tsx`, keeps Phase 8 intact): emit only
never-emitted settled text —
`if (debounced === text && text !== value && text !== lastEmitted.current)`,
with `lastEmitted` ref (mount-seeded, StrictMode-safe idempotent emit).
Genuine typing always produces unseen settled text → emits; post-reset
echoes always repeat the last emission → never do. Verified by probe:
clean URL + 20 rows in <1s, zero oscillation, zero console errors, stable
12s. (An earlier full-suite run showing 2 failures was stale-HMR — the
dev server was still recompiling; the clean re-run below is authoritative.)

Final: **5 passed (1.1m)** — search + status + clear-restore + open,
pagination, details→Back, share-link cold load, reload. No app behavior
besides the input emission path changed; adopt/commit/validation/API
untouched.

## 3. EXPLAIN Q1–Q3 (T-QRY-06 evidence, 63-row disposable scale)

- Q1 offset+status: **Seq Scan + Sort, 0.16ms** (planner rightly skips
  indexes at this size). With `enable_seqscan=off`: Bitmap Heap Scan +
  Sort using the filter shape — composite `IDX_parcels_merchant_status_created`
  present and applicable; sort-free plan not provable without volume.
- Q2 keyset (`createdAt`+`id` tuple, `ORDER BY createdAt DESC, id DESC`):
  Bitmap + **Sort on `(createdAt, id)`** — confirms the cursor path is the
  one that wants the candidate `(merchant_id, createdAt DESC, id DESC)`
  composite AT SCALE. No blind DDL added.
- Q3 history range: Bitmap + Sort, 0.09ms.

Decision: T-QRY-06 stays open pending a scaled disposable dataset
(~200k parcels via `generate_series`, Phase 13) → re-run Q1–Q3 → index
decision on evidence. Nothing here justifies DDL today.

## 4. Scrape curl (T-OPS-02 endpoint proven live)

`GET /health/metrics/prometheus` returned all 10 families with real values:
267 requests served, `dhruto_db_up 1`, pool total/idle/active real,
per-queue depths, `dhruto_cache_hit_rate 68`, memory bytes. Reference
latencies on this dev box: p50 22ms / p95 369ms / p99 1278ms (includes
Brave-run traffic). Remaining: external scraper + the 2 alert rules
(Phase 11 doc) — operational, owner-side.

## 5. Backup/restore drill — PASS (MVP gate line closed)

- Found + fixed a real blocker: `backup-db.ps1`/`restore-db.ps1` declared
  `[string]$Host`, colliding with PowerShell's read-only automatic `$Host`
  → instant abort on pwsh 7+. Renamed to `$DbHost` (no external callers).
- `backup-db.ps1 -Database dhruto_phase9`: pg_dump plain, **506KB +
  SHA-256 recorded**.
- `restore-db.ps1` into scratch `dhruto_restore_test`: **integrity PASSED**,
  restore clean, counts identical (parcels **63** = 37 seed + 26 run-created
  | migrations 10 | users 11), `migration:show` → **no pending**.
  Scratch DB dropped after.

## 6. Load harness (Phase 10 hardening proven)

`node scripts/load-baseline.mjs` (200/5/200/60/150/150): **zero throttled,
zero errors in every scenario** — the 3-account rotation works (previously
~80 parcel-list 429s). Numbers (dev laptop, single box): health 306 RPS;
parcel-list 91 RPS, **p50 254 / p95 328ms** → verdict correctly reports
**NOT MET** vs the 300ms staging goal (dev-box + Upstash-limiter latency,
not app pathology); create p95 301ms; overview p95 600ms; parse p95 692ms;
login 5/5 (bcrypt-bound, as documented).

## Regression status

Behavior changes this phase: (1) input emission gate (the fix),
(2) `$Host`→`$DbHost` in the two backup scripts (crash fix). Everything
else is specs/docs. Evidence: limiter specs 2/2, Brave 5/5, drill green,
harness all-ok, EXPLAIN recorded, scrape live.

## Deferred (updated)

T-QRY-06 → scaled-dataset re-measurement (Phase 13). T-OPS-02 → scraper
wiring only. Bulk queue / auto-RTO / scan-mapping → still demand-gated,
no trigger.

## Next-phase preview (Phase 13 candidates)

1. Scaled disposable seed (~200k parcels) → Q1–Q3 re-run → cursor-index
   verdict with numbers.
2. Scraper + alerts live; paste the first 24h dashboard snapshot.
3. Any demand trigger that arrived → build only that; else verification
   backlog is green — say so and stop.
