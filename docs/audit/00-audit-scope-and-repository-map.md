# 00 — Audit Scope & Repository Map

## 1. Actual discovered structure
```
dhruto/                          # pnpm@12.4.2 workspaces, turbo@2.11.7, node>=20.18
├── apps/
│   ├── api/                     # @dhruto/api — NestJS 11 + TypeORM 0.3 + BullMQ 5 + Swagger
│   │   └── src/{analytics,auth,common,config,database,events,finance,health,hubs,
│   │              integrations,intelligence,merchants,notifications,parcels,pricing,
│   │              queues,riders,webhooks}/  + main.ts + app.module.ts
│   └── web-merchant/            # @dhruto/web-merchant — Next 16 (App Router) + React 19
│       ├── app/[locale]/{(public),(auth),(merchant),(admin),(hub),(rider)}/  # 57 page.tsx
│       ├── features/{about,admin,analytics,auth,contact,dashboard,faq,finance,hubs,
│       │             integrations,intelligence,marketing,merchants,notifications,observability,
│       │             parcels,pricing,privacy,riders,services,terms,tracking,webhooks}/
│       ├── store/{auth.slice,index,hooks}.ts  # Redux Toolkit + RTK Query (base-api)
│       ├── config/{routes,roles,navigation,route-base,status}.ts
│       ├── lib/, hooks/, components/, messages/{en,bn}.json, proxy.ts
├── packages/
│   ├── contracts/               # @dhruto/contracts — Zod schemas (parcel/hub/rider/finance/…)
│   ├── ui/                      # @dhruto/ui — Radix + Tailwind primitives (button/card/table/…)
│   ├── eslint-config/ + tsconfig/
├── docs/{01-BRD,…,15-QA-RELEASE,DESIGN-SYSTEM,…}.md  # pre-existing product docs (preserved)
├── docker-compose.yml           # postgres:16-alpine + redis:7-alpine only (no api/web services)
├── .github/workflows/ci.yml     # quality (lint/typecheck/test/build) + e2e on main/dispatch
└── turbo.json / pnpm-workspace.yaml / package.json
```

Evidence: `apps/api/src` directory read (20 entries); `apps/web-merchant/app` glob (57 `page.tsx`); `packages/*` reads; `docker-compose.yml:1-54`; `.github/workflows` (single `ci.yml`); root `package.json:1-27`.

## 2. Technologies (observed, not assumed)
| Layer | Stack | Evidence |
|---|---|---|
| Monorepo | pnpm workspaces `apps/*,packages/*` + Turbo tasks build/dev/lint/typecheck/test/test:e2e | `pnpm-workspace.yaml:1-3`, `turbo.json:4-33` |
| Frontend | Next 16.3.8 App Router, `app/[locale]/(group)` (group not in URL), `next-intl` en/bn, React 19, RTK Query, RHF+Zod, Tailwind 3.4, Radix, `output:standalone`, PWA (sw/manifest) | `apps/web-merchant/package.json`, `next.config.ts`, `proxy.ts`, `src/i18n/routing.ts`, `lib/api/base-api.ts` |
| Backend | Nest 11, global prefix `/api/v1` (health excluded), `DhrutoValidationPipe` (422), `AllExceptionsFilter`, 3 interceptors (response/logging/telemetry), `RequestIdMiddleware`, Swagger `/docs` | `apps/api/src/main.ts:15,35-37`, `app.module.ts:60-86` |
| Data | Postgres 16 + TypeORM (`synchronize=false`, `migrationsRun:false`), Redis 7 (cache + BullMQ), `EventOutbox` + poller | `config/database.config.ts:16-33`, `config/redis.config.ts`, `database/data-source.ts`, `queues/queues.module.ts` |
| Auth | Custom HS256 JWT (15m/7d, localStorage), `JwtAuthGuard` + `RolesGuard` (ADMIN bypass) per-controller (not global), hub scoping via `HubUserAssignment` | `auth/jwt/custom-jwt.service.ts`, `guards/*.ts`, `common/permissions/hub-permissions.ts`, `hubs/hub-authorization.service.ts` |
| Shared | `@dhruto/contracts` Zod (backend DTOs `implements` contract types); `@dhruto/ui` primitives | `packages/contracts/src/**/ *.schema.ts` (14 files), `packages/ui/src/components/*` |
| Tests | API: Vitest unit (`src/**/*.spec.ts` 15 files) + supertest e2e (`test/*.e2e-spec.ts` 14 files); Web: Vitest jsdom (`tests/unit` 28 files) + Playwright (`tests/e2e` 24 files, chromium + Pixel5) | `vitest.config.ts` x2, `playwright.config.ts`, `package.json` scripts |

## 3. Audit scope (included)
- All 57 frontend routes (public/auth/merchant-12/admin-14/hub-10/rider-6 + ungrouped analytics/offline/catch-all + robots/sitemap/manifest/icons).
- All 16 backend modules, 15 controllers, 152 endpoint handlers, 46 entities + Base, 10 migrations, 12 seed files.
- Auth/RBAC, tenant isolation, money/ledger, idempotency, rate-limit, queues/events, integrations (SMS/email/webhook providers), intelligence (address/risk/RTO), analytics (legacy + v2 + alerts/exports), health/observability.
- RTK Query clients (`features/*/api/*.api.ts`), nav/role configs, i18n (en/bn), PWA/SEO, CI, env key names, pre-existing `docs/*.md` (read-only reference).

## 4. Excluded / limitations
- No prod data, no live deployment, no secret values (only key names from `.env.example`).
- No execution of lint/typecheck/tests/build in this pass (heavy); verification = static reads + `Get-ChildItem`/`Select-String` counts. Recorded in `18`.
- No destructive commands (no `migration:run/revert`, `db:setup`, `seed`, payment, notification sends).
- `node_modules/`, `.next/`, `dist/` ignored. Binary assets not inspected.
- Behavior claims require code evidence; otherwise marked Unknown/Unverified per rule 7.

## 5. Evidence collection approach
1. Filesystem inventory (router + controllers + entities + tests) with counts.
2. Decorator/DTO/config reads (method+path+roles+validation).
3. Nav-vs-router reconciliation (`config/navigation.ts` vs `app/**/page.tsx`).
4. Contract-vs-DTO spot checks (`implements` + Zod vs `class-validator`).
5. Test file intent survey (no pass/fail claims without execution).
6. Config key-name survey (never values).
7. Three parallel explore subagents for breadth + direct count verification for numbers reported.
8. Cross-document consistency check before final summary.

## 6. Counting conventions
- Routes = `page.tsx` files (57). Groups exclude `(group)` segment; `[locale]` = `/:locale` (en|bn).
- Endpoints = `@Get/@Post/...` decorators in `*.controller.ts` (152 handlers across 15 controllers; health 5 handlers × 2 prefixes counted once each).
- Entities = `*.entity.ts` files (47 incl. `Base`; 46 concrete tables).
- Tests = files (API 14 e2e + 15 unit; Web 24 e2e + 28 unit), not individual `it/test` (sampled counts in `12`).
