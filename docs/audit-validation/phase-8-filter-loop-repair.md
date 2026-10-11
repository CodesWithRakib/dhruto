# Phase 8 — Filter-State Render Loop Repair (F-UI-01)

> Per owner instruction, no browser test runs in the closing pass; verification below is static (typecheck/lint) plus the jsdom regression test. All debug instrumentation and scratch specs were removed; the tree contains only the fix, its test, and the earlier stale-selector test update.

## Root cause (confirmed by isolation + code proof)
"Clear filters" left the URL untouched and React threw "Maximum update depth exceeded". Isolated facts:
- Neutralized reset body → quiet; URL-only reset → loop; local-only reset → loop; adopt/commit effect fire-counts frozen post-click — so the cycle is not a single guilty effect but the adopt/commit pair fighting over a stale debounce:
  1. Reset clears locals + URL in one tick while debounced text is still pre-reset.
  2. The commit effect sees stale debounced ≠ clean URL and re-adds the text param.
  3. The adopt effect pulls it back into the fields; repetitions (amplified by StrictMode double-invocation in dev) trip the update-depth guard and freeze the UI with filters stuck.
- A consumable-flag fix was rejected during diagnosis: StrictMode eats one-shot flags, so the guard had to be correct by construction.
- Deterministic jsdom repro (real timers): pre-fix tree left `search=` resurrected in the URL; post-fix tree leaves a clean URL.

## Fix (`features/parcels/hooks/use-parcels-list.ts`, commit effect only)
- The commit effect now writes a text param only when the debounced value matches the live field text (`debouncedSearch.trim() === search.trim()`, same for district/thana). Stale post-reset debounce matches nothing, so nothing is written; genuine typing still matches and commits; back/forward/share-link flows are unaffected (adopt pulls URL→field, debounce follows, commit is a no-op on equality).
- Idempotent under StrictMode (pure state comparison, no consumable flag). No other files changed for this fix.

## Tests
- NEW `tests/unit/parcels-reset.test.tsx` (2, green in the last executed run): reset-with-stale-debounce leaves a clean URL with bounded navigations; typing still commits to the URL.
- Existing `parcel-list.spec.ts` stale `<select>` selector updated to the toggle-group UI earlier (tab-filter steps pass in Brave).
- The full parcel-list journey re-verification in Brave (clear-filters restore + back/forward/share-link) is PENDING owner-run test pass — no test commands were executed to close out, per instruction.

## Regression status
- Web typecheck clean (excluding the pre-existing corrupt gitignored `.next/dev/types` artifact; production `next build` is authoritative and was green in Phase 7), ESLint clean on touched files.
- No app behavior besides the filter commit path was altered; adopt effects, validation, API, and backend untouched in this phase.
- Known red remains: `parcel-list` journey "clear filters restores results" until the Brave re-verification run passes.
