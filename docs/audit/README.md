# DHRUTO Audit — Documentation Index

> Audit-only package. Repository is source of truth. Existing behavior vs proposed behavior vs unverified assumptions are kept separate. No app source was changed in this phase.

## How to read
1. Start with `00` (scope + map), then `01` (routes), `02`/`03` (roles + workflows).
2. Deep dives: `04` (frontend), `05` (API), `06` (DB).
3. Synthesis: `07` (completeness matrix), `08` (integration map).
4. Proposals (all labelled RECOMMENDATION): `09` (routes/nav), `10`/`11` (query architecture + page specs).
5. Quality gates: `12` (tests), `13` (security/perf/ops), `14` (a11y/i18n).
6. Action: `15` (master TODO), `16` (roadmap), `17` (ADRs), `18` (findings + limitations).
7. Detail folders: `pages/`, `workflows/`, `api/`, `test-cases/`, `pagination/`.

## Index
| Doc | Purpose |
|---|---|
| `AUDIT-PROGRESS.md` | Persistent checklist + resume point |
| `README.md` | This index |
| `00-audit-scope-and-repository-map.md` | Discovered structure, tech, scope, exclusions, method |
| `01-frontend-route-and-page-inventory.md` | All 57 routes + role-by-route matrix |
| `02-user-roles-and-permissions.md` | Roles, guards, tenant boundaries |
| `03-end-to-end-business-workflows.md` | Workflow index + links to `workflows/` |
| `04-frontend-quality-and-ux-audit.md` | Nav/IA, UI/UX, frontend architecture issues |
| `05-backend-api-audit.md` | Endpoint catalog index + links to `api/` |
| `06-database-and-data-integrity-audit.md` | Entities, constraints, money, isolation |
| `07-feature-completeness-matrix.md` | Cross-layer matrix (feature → UI → API → DB → tests → status) |
| `08-integration-and-dependency-map.md` | Frontend↔backend↔DB↔queue↔external deps |
| `09-proposed-route-and-navigation-architecture.md` | Current vs proposed trees (RECOMMENDATION) |
| `10-pagination-filtering-and-query-architecture.md` | Shared contracts, offset vs cursor (RECOMMENDATION) |
| `11-page-data-and-table-specifications.md` | Per-table specs index + links to `pagination/` |
| `12-test-strategy.md` | Test plan index + links to `test-cases/` |
| `13-security-performance-and-operations.md` | Risks P0–P3 with evidence |
| `14-accessibility-and-localization.md` | A11y + bn/en + timezone findings |
| `15-prioritized-master-todo.md` | Actionable backlog (ID, priority, deps, acceptance) |
| `16-implementation-roadmap.md` | Phased delivery plan with exit criteria |
| `17-architecture-decisions.md` | ADRs (problem → options → recommendation) |
| `18-audit-findings-and-limitations.md` | Counts, severities, unverified/blocked areas, verification log |
| `pages/` | Per-module page specs (grouped; covers all 57 routes) + `_template.md` |
| `workflows/` | Step-by-step business workflows + `_template.md` |
| `api/` | Per-module endpoint catalogs |
| `test-cases/` | Per-module test cases |
| `pagination/` | Per-table data designs |

## Status legend (used everywhere)
`Verified` = code + test/config evidence observed. `Unverified` = code exists, behavior not executed. `Partial` = flow incomplete. `UI-only/mocked` = no backend persistence. `Backend-only` = no frontend consumer. `Missing` = expected but absent. `Broken/inconsistent` = contradicts itself. `Blocked` = needs external config. `Unknown` = insufficient evidence.

## Non-goals of this package
No code changes, no migrations, no secret values, no invented requirements. Every RECOMMENDATION states business value and is separable from existing behavior.
