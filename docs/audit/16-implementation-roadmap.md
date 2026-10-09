# 16 — Implementation Roadmap (phased, reviewable; no dates)

> Each phase: scope → prerequisites → deliverables → tests → exit criteria. Stop after audit; owner approves phase order. IDs from `15`.

## Phase 0 — Prove money + baseline (P0, no behavior change)
Scope: T-FIN-00, T-TST-01 (run `finance-ledger`, `finance`, `parcels`, `delivery`, `hubs` e2e + unit), T-DB-01 audit, record results in `18`. Prereqs: staging-like PG+Redis, `db:setup` on disposable DB (never prod). Deliverables: green logs + invariant note. Exit: ledger balanced asserts pass; no `remove()` on ledger.

## Phase 1 — Close critical security holes (P0)
Scope: T-SEC-01–04 (+T-SEC-05 fail-closed). Prereqs: Phase 0 green. Deliverables: role allowlist, auth rate-limits, secret rotation + ignore + scan, `APP_GUARD` default-deny. Tests: TC-AUTH-002/005 + arch test + full auth e2e. Exit: self-ADMIN 403; auth 429; no `.env` tracked; new controller denied by default.

## Phase 2 — Fix broken/incomplete + dead links (P1)
Scope: T-AUTH-01, T-API-01/02 (DTOs), T-UI-01–04, T-API-03/04, T-INT-02/04/05. Prereqs: Phase 1. Deliverables: settings pages, rotation, validated DTOs, live KPIs, 404s, routed-or-removed orphans. Tests: TC-AUTH-004, parcel/file matrix, analytics 404. Exit: zero dead nav links; zero static KPIs; zero orphan routes/hooks.

## Phase 3 — Navigation restructuring (per `09`)
Scope: T-NAV-01–06. Prereqs: Phase 2 (links stable). Deliverables: module landings, grouped navs, breadcrumbs, label fixes, `/analytics` removal + redirects. Tests: `public-and-routes` extended + mobile nav + role matrices. Exit: every page ≤2 clicks from module home; nav coverage 100%.

## Phase 4 — Shared query + table specs (per `10`/`11`)
Scope: T-QRY-01–06. Prereqs: Phase 3 (lists keep URLs). Deliverables: contracts, `mode` cursor, legacy deprecation, `useQueryState+infinite-list`, `EXPLAIN` + indexes. Tests: cursor round-trip, filter-mismatch, out-of-range, perf budgets. Exit: one query contract per resource; p95 list <300ms target.

## Phase 5 — Missing capabilities (product decisions first)
Scope: T-FEAT-01 (bulk: build or cut), T-FEAT-02/03 (+04/05 scoping). Prereqs: Phases 1–4 + owner decisions (bulk format/limits, edit policy, recovery channel). Deliverables: bulk job + report OR nav removal; edit/cancel; recovery. Tests: bulk e2e, edit matrix, recovery. Exit: nav == capability; no mocked buttons.

## Phase 6 — Money/DB hardening + ops
Scope: T-FIN-01, T-DB-02/03, T-OPS-01–05, T-API-05. Prereqs: Phase 5 (no money-shape churn before). Deliverables: minor-canonical reads, retention doc, Docker images + compose, gated metrics, env asserts, Swagger. Tests: ledger + load + Redis-down drill. Exit: staging deploy reproducible; metrics gated; load target met or budgeted.

## Phase 7 — Quality gates + UX polish
Scope: T-TST-02–05, T-UX-01–04, T-FEAT-06/07 (as scoped). Prereqs: Phases 1–6. Deliverables: axe/key-diff/budget CI, confirms, focus/i18n/tz fixes, invoice/auto-settle (if approved). Tests: full pyramid + security/resilience. Exit: 0 axe-critical; 0 missing bn keys; PII review signed.

## Long-term (after): T-LT-01–04 (retrain, route-opt, scheduled reports, CUSTOMER scope).

## Dependency graph (abridged)
`0 → 1 → 2 → 3 → 4 → 5 → 6 → 7`; `T-SEC-03` before any prod deploy; `T-FIN-00` before `T-FIN-01`; `T-UI-02` decision gates `T-FEAT-01`; `T-QRY-06` needs staging data volume.
