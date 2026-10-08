# Dhruto — QA, Testing & Release Guide

## Commands

```text
pnpm lint          # ESLint across the monorepo (turbo)
pnpm typecheck     # tsc --noEmit per package
pnpm test          # unit + component (vitest run, per package)
pnpm build         # production builds
pnpm test:e2e      # Playwright journeys (needs the full stack below)
```

Single package / single file:

```text
pnpm --filter @dhruto/web-merchant test
pnpm --filter @dhruto/web-merchant exec vitest run tests/unit/roles-permissions.test.ts
pnpm --filter @dhruto/web-merchant exec playwright test tests/e2e/merchant-login.spec.ts
```

## Test environment (E2E)

Playwright needs the real stack: Postgres + Redis, migrated + seeded API,
and the web app. The E2E suite never runs against production.

```text
docker compose up -d postgres redis
pnpm --filter @dhruto/api db:setup     # build + migrate + seed (roles, hubs, merchants, riders, parcels, wallets)
pnpm --filter @dhruto/api start        # :4000, health at /health
pnpm --filter @dhruto/web-merchant build
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5000 pnpm --filter @dhruto/web-merchant start
pnpm --filter @dhruto/web-merchant test:e2e
```

Without `PLAYWRIGHT_TEST_BASE_URL`, Playwright starts `pnpm dev` itself.
`PLAYWRIGHT_API_URL` overrides the API base for test helpers (default
`http://localhost:4000/api/v1`). Seed users: `merchant@dhruto.com`,
`merchant2@dhruto.com`, password `dhruto123` (see `tests/e2e/helpers/*`).

Environment variables:

- Web (`apps/web-merchant/.env.local`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`.
  Only `NEXT_PUBLIC_*` reaches the browser — never put secrets there.
- API (`apps/api/.env`, gitignored): database, Redis, JWT secrets. In CI it is
  written from the `DHRUTO_API_ENV` repo secret. Never commit it.

## What runs where

- Every PR: `lint → typecheck → test → build` (`.github/workflows/ci.yml`,
  `quality` job). Fast and deterministic.
- `main` + manual dispatch: full Playwright journeys against a seeded backend
  (`e2e` job with Postgres/Redis services, trace artifacts on failure).
- Heavy load/performance probes are scheduled/manual only — never per-PR.

## Test inventory (web-merchant)

- `tests/unit`: formatters (en+bn), status tones, query-state, parcel-list
  normalization, roles/permissions, reauth + token hygiene, storage helpers,
  component behavior (pagination, filters, dialogs, timeline, combobox,
  toolbar, states), finance components, booking/pricing.
- `tests/e2e`: login, session lifecycle + role isolation, booking, parcel
  list/details/label, tracking, rider delivery, hub bagging/dispatch/inbound,
  finance (merchant/hub/admin), bn spot checks, mobile journeys, public pages.

Conventions: semantic selectors (`getByRole/getByLabel/getByText`), unique
fixtures per test (`makeBookingFixture`), no arbitrary sleeps, no `any`.

## Release checklist (minimum gate)

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` green.
2. E2E journeys green on a seeded staging stack (auth, booking, list,
   details, rider delivery, hub dispatch, finance settlement, logout).
3. `en` + `bn` catalogs in sync (same key count, no missing keys).
4. No `any`/`as any`, no `console.*`, no hardcoded secrets, no static demo
   data in production components.
5. Confirm the scorecard below before tagging.

## Production-readiness scorecard

See the Phase 7 final report for the assessed values. Template:

```text
Area                  Status       Risk
Authentication        PASS/FAIL    Critical/High/Medium/Low
Authorization         ...
Merchant Workflow     ...
Rider Workflow        ...
Hub Workflow          ...
COD Workflow          ...
Settlement            ...
Shipment Lifecycle    ...
Smart Address         ...
Localization          ...
Responsive UX         ...
Accessibility         ...
API Contracts         ...
Realtime              ...
Error Handling        ...
Performance           ...
Load Testing          ...
Security              ...
Observability         ...
CI/CD                 ...
Release Readiness     ...
```
