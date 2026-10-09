# 17 — Architecture Decisions (ADRs — RECOMMENDATION, needs owner approval where marked)

## ADR-01 Guards: global default-deny vs per-controller (APPROVAL: yes)
Problem: open-by-omission risk (`app.module.ts` no `APP_GUARD`). Options: (a) global `JwtAuthGuard+RolesGuard` + `@Public` (chosen — fail-closed, matches Nest idiom); (b) lint rule requiring guards (weaker). Trade-off: must audit every `@Public` once. Recommendation: (a) + arch test. Owner approval: yes (auth posture).

## ADR-02 JWT: keep custom HS256 vs adopt vetted lib / rotation store (APPROVAL: yes)
Problem: custom crypto + no rotation + dev fallback. Options: (a) keep custom + add jti/version blacklist + fail-closed (minimal churn); (b) migrate to `passport-jwt`/`jose` + refresh store. Recommendation: (a) now (rotation/revocation), (b) later if session features grow. Approval: yes.

## ADR-03 Money units: `bigint minor` canonical vs `decimal` compat (APPROVAL: yes)
Problem: dual units (`06§3`). Options: (a) minor canonical, decimal compat getters (chosen — integer math, matches Phase4+); (b) decimal everywhere (churn + float risk). Recommendation: (a) + `money.ts` single entry. Approval: yes (financial).

## ADR-04 Pagination: offset-default + cursor-opt vs cursor-everywhere (APPROVAL: no)
Per `10§1`: admin/merchant lists offset (page numbers + totals); feeds/scans/history cursor; lookups none. Rationale: UX + cost, not dogma.

## ADR-05 Analytics: deprecate legacy `period` vs dual-forever (APPROVAL: no)
Keep both 2 majors with Swagger `deprecated`, new code uses range `preset/timezone`. Rationale: compat + consolidation.

## ADR-06 Nav: module landings vs flat sidebar (APPROVAL: yes)
Per `09`: 4 merchant modules, filled admin/hub/rider navs, breadcrumbs, `/analytics` removal. Rationale: discoverability; URL-stable (mostly nav-only). Approval: yes (UX).

## ADR-07 Bulk: build job vs cut nav (APPROVAL: yes — product)
`xlsx` dep hints bulk intent but no route/UI. Options: (a) CSV/XLSX async job + report (XL); (b) remove `?mode=bulk` (S). Recommendation: decide in Phase 5 kickoff. Approval: yes.

## ADR-08 Providers: log-fallback vs hard-fail without keys (APPROVAL: no)
Keep `enqueueOrInline` fail-open for queues + log-transport for SMS/email in dev, but startup WARN + health note; staging/prod require keys. Rationale: dev velocity + explicit blocked status.

## ADR-09 No new tech (APPROVAL: n/a)
No new DB/queue/lib introduced. Reuse: BullMQ, `contracts` Zod, `@dhruto/ui`, `useQueryState`, `feedback/states`. Axe + key-diff are dev-only test deps (justified in `12`/`14`).

## ADR-10 Soft-delete: keep status-lifecycle vs add `deletedAt` (APPROVAL: yes)
Keep no-soft-delete + explicit retention/audit policy (simpler + matches append-only history/ledger). Revisit if GDPR-style erasure requires tombstones. Approval: yes (data).
