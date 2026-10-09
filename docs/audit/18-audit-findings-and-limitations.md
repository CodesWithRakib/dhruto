# 18 — Audit Findings, Limitations & Verification Log

## 1. Scope inspected
Turborepo (`pnpm` + `turbo`): `apps/api` (Nest 11, 16 modules, 15 controllers, 152 handlers, 46 entities + Base, 10 migrations, 12 seed files, BullMQ + outbox + custom JWT) + `apps/web-merchant` (Next 16 App Router, 57 `page.tsx` across public-10/auth-2/merchant-12/admin-14/hub-10/rider-6 + 3 ungrouped, 24 feature domains, RTK Query, en/bn, PWA) + `packages/contracts` (14 Zod schemas) + `packages/ui` (Radix/Tailwind primitives) + `docker-compose` (PG16+Redis7) + `ci.yml` (quality + main-only e2e) + pre-existing `docs/*.md` (19 files, preserved).

## 2. Counts (conventions in `00§6`)
- Routes: **57** `page.tsx` (10 public, 2 auth, 12 merchant, 14 admin, 10 hub, 6 rider, 3 ungrouped) + robots/sitemap/manifest/icons.
- Backend: **16** modules, **15** controllers, **152** endpoint decorators, **46** tables + Base, **10** migrations.
- Features: **25** rows in `07` (0 Verified here, 13 implemented-unverified, 4 partial, 1 UI-mocked/missing hybrid, 2 backend-only, 4 missing + bulk).
- Tests (files): API **14** e2e + **15** unit; Web **24** e2e + **28** unit. Individual `it/test` sampled in `12` (e.g. parcels 29, delivery 19, lifecycle 20, pricing 17).
- Docs created: **19** top-level (`00–18` = 19 files) + `README` + `AUDIT-PROGRESS` (2) + `pages/` 5 + `workflows/` 12 + `api/` 5 + `test-cases/` 7 + `pagination/` 3 = **52 files**. No app source changed (pre-existing `M apps/web-merchant/next-env.d.ts` — Next generated `dev/types` vs `types` path — was observed via `git status`, not made by this audit; only `docs/audit/` is new).

## 3. Findings by severity/status
- P0 (5): self-register ADMIN (Broken), auth no rate-limit (Missing), `.env` committed (Broken), guards not global (Inconsistent), ledger proof not executed here (Unverified).
- P1 (17): refresh/logout, JWT fallback, raw-body DTOs, rate-limit drift, money dual, `/analytics` guard, body/timeout vs bulk, cache-health, static KPIs, bulk-mocked, no edit/cancel, dead settings, orphans, invalid-section empty, orphan `cancelSettlementBatch`, confirm inconsistency, query dual-shapes.
- P2 (25+) / P3 (8+): see `04`, `05`, `06`, `13`, `14` tables.
- Most risky workflows: **W7 finance** (unverified invariants here — run first), **W1 auth** (escalation + brute-force), **W6 delivery** (OTP/COD concurrency — covered by tests but unexecuted), **W2 booking** (bulk-mocked), **W8 returns** (partial, no dedicated flow).

## 4. Nav/route + query recommendations (summary)
- Nav (`09`): module landings (merchant Parcels/Finance/Insight/Settings), fill 8 orphans, expand admin analytics 5→12 groups, fix labels, breadcrumbs, remove `/:locale/analytics` dup, create `*/settings` or remove links. URL-stable except `?mode=bulk → /parcels/bulk` (if built).
- Query (`10`/`11`): offset for admin tables + merchant lists (default) with cursor opt; cursor for feeds/scans/history; shared contracts + `useQueryState` validators + `infinite-list`; deprecate analytics legacy; unfix rider history; `EXPLAIN` + indexes.

## 5. Verification commands executed (safe, non-destructive)
| Command | Result |
|---|---|
| `Get-ChildItem app -Recurse -Filter page.tsx` (count) | 57 |
| `Get-ChildItem api/src -Recurse -Filter *.controller.ts` | 15 |
| `Get-ChildItem entities -Filter *.entity.ts` | 47 (46 + Base) |
| `Get-ChildItem migrations -Filter *.ts` | 10 |
| `Get-ChildItem api/test -Filter *.e2e-spec.ts` | 14 |
| `Get-ChildItem api/src -Recurse -Filter *.spec.ts` | 15 |
| `Get-ChildItem web tests/e2e -Recurse -Filter *.spec.ts` | 24 |
| `Get-ChildItem web tests/unit -Filter *.test.*` | 28 |
| `Select-String controllers -Pattern @(Get\|Post\|Put\|Patch\|Delete)\(` | 152 |
| `Get-ChildItem contracts/src -Recurse -Filter *.schema.ts` | 14 |
| `Get-Content .env.example` (key names only) | 34 keys inventoried (no values read/printed) |
| `Get-ChildItem .github/workflows` / `docs -Filter *.md` / `config` / `messages` | `ci.yml`; 19 docs sized; 5 configs; `en|bn.json` |
| `Test-Path + New-Item docs/audit/*` | 5 subdirs created |

Lint/typecheck/build/tests NOT executed (heavy + need DB/Redis for e2e); all behavior statuses are therefore `Implemented but not verified` or weaker — no pass/fail claimed. No migrations/seeds/payments/notifications run. No secret values printed.

## 6. Unverified / blocked
Unverified: runtime rendering, API responses, guard enforcement, money math, queue delivery, i18n runtime parity, bundle sizes, `EXPLAIN` plans, load `250RPS`. Blocked: real SMS/email (needs provider keys), prod deploy (no Dockerfiles/manifests), refresh-reuse (needs rotation impl), bulk (needs product decision), retraining (external). Unknown: bulk endpoint intent (`xlsx` dep), `hub/parcels` list-vs-lookup intent, zero-verify rule, vehicle master data, push scope.

## 7. Proposed corrections to existing docs (recorded, not applied)
- `docs/05-API-SPEC.md` may predate cursor/Phase7 range shapes — reconcile with `ParcelListQueryDto` + `AnalyticsRangeQueryDto` after `10` lands.
- `docs/04-DATABASE-DESIGN.md` may predate bigint-minor ledger — reconcile with `06§3`.
- `docs/10-SECURITY.md §1,3` asks rotation/revocation + rate-limits — mark as not-implemented until Phase 1.
- `docs/13-IMPLEMENTATION-ROADMAP.md` is the old plan — superseded by audit `16` until owner reconciles.

## 8. First implementation phase (recommended)
**Phase 0 (prove money + baseline)** per `16`: run `finance-ledger.e2e` + `finance.e2e` (+ parcels/delivery/hubs) on disposable CI-like DB, plus `T-DB-01` no-`remove()` audit; record greens in this file. Prereqs: PG16+Redis7 from `docker-compose.yml`, `db:setup` on throwaway DB. Then Phase 1 security (T-SEC-01–04). Do NOT implement until owner approves.
