# Phase 7 — Bulk Upload UI + Browser Pass (implementation report)

> Bulk dialog design decision (no owner input needed): dialog on the parcels list page (bulk actions belong on lists per audit nav principles), CSV first (template endpoint already serves the header). No secrets printed. User ran the web dev server; API ran from `dist` on disposable DBs.

## UI — Bulk import dialog (DONE + VERIFIED)
- **Files:** NEW `features/parcels/lib/csv.ts` (dependency-free RFC-4180 parser + row mapper), NEW `features/parcels/components/bulk-import-dialog.tsx` (file → parse → server dry-run with fee preview → import with `crypto.randomUUID` batch key → per-row results; toasts; "—" loading states), `features/parcels/api/parcels.api.ts` (template/validate/import endpoints + hooks, list invalidation on import), `features/parcels/components/parcel-list.tsx` (Bulk import button next to Create, merchant-only via `createHref`; dialog mounted only when open so no RTK hooks run on plain renders), `messages/en.json` + `bn.json` (19 keys each).
- **Tests:** NEW `tests/unit/bulk-csv.test.ts` (4: parse/quotes/CRLF/errors/row mapping). Web unit 142/142 (29 files). Web production build succeeds.
- **Drive-by fix:** `hooks/use-query-state.ts` `reset` signature `(...keys)` → `(keys)` to match its interface (real pre-existing TS2322; all callers pass arrays).

## Playwright in Brave (per testing instruction)
- Brave launched with remote debugging (:9222); suites run via NEW `playwright.brave.config.ts` (temp runner config using the installed Brave binary, desktop project, 1 worker) against user-run dev (:5000) + API (`dist`, disposable DB).
- **Bulk spec NEW `merchant-bulk.spec.ts` + fixtures (2/2 PASS):** CSV upload → fee preview → import → rows listed; malformed CSV rejected client-side with no network call.
- **Neighbors:** create-parcel (3), booking smoke (1), parcel-details (2) PASS. **parcel-list journey 3: 1/2** — search/tab/restore steps pass; final "Clear filters restores results" fails (pre-existing, see below).
- **Stale-server lesson:** an unknown stale prod server on :5000 served an old build (booking page 404); all early failures were its artifact. Resolved by running against the fresh dev server; booking page 200.

## Known failure carried forward (NOT fixed per owner instruction to move on)
- **F-UI-01 (P1, pre-existing, unrelated to bulk): "Clear filters" is a no-op.** Isolated repro: clean URL `?search=ZZZNOMATCH&status=CREATED` + click any Clear-filters control → URL unchanged after 10s; console shows `resetFilters` → `query.reset` firing, then React **"Maximum update depth exceeded"** (render loop between the adopt/commit URL-sync effects in `use-parcels-list.ts`, triggered when reset clears locals + URL in one tick while debounced text is stale). A suppress-flag attempt did NOT break the loop — root cause is deeper (exact cycle unidentified). Debug logs reverted; scratch specs deleted. The stale `<select>` selector in the same spec WAS fixed (updated to the toggle-group UI; tab-filter steps now pass).
- Recommended next: dedicated filter-state slice (repro + effect-cycle profiling + fix + regression), owned separately from bulk work.

## Regression
| Check | Result |
|---|---|
| API full suite | 350/350 (unchanged code paths; rerun in Phase 6) |
| Web unit (incl. new csv spec) | 142/142 |
| Web production build / API build | success |
| API typecheck/lint | clean; web typecheck clean except gitignored stale `.next/dev/types` artifact (production build is authoritative and green) |
| Playwright (Brave, user servers) | bulk 2/2; neighbors 7/8 (1 pre-existing F-UI-01) |

## Deferred (unchanged)
Q-BULK async jobs, auto-RTO, scan-mapping, photo/duty/onboarding/rotation/money-schedule, multi-instance limiter e2e, load targets, F-UI-01 fix.
