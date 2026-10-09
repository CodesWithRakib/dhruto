# 04 — Frontend Quality & UX Audit

> Evidence: `app/**` pages, `features/*/components/*`, `config/*`, `components/{layout,feedback,data-display,filters}`, `lib/*`, `hooks/use-query-state.ts`, `messages/*.json`, `packages/ui/src/*`. Severity: P0 critical / P1 high / P2 medium / P3 low. Each issue: page/component + evidence + impact + proposal + deps + acceptance.

## A. Navigation & IA
| ID | Issue | Evidence | Impact | Severity | Proposal / acceptance |
|---|---|---|---|---|---|
| F-NAV-01 | Sidebar flat: merchant 9 items in 1 group; orphans bypass nav | `config/navigation.ts` (MERCHANT single group) vs 12 merchant pages; orphans listed in `01§4` | Discoverability loss; bell-only notifications | P1 | RECOMMENDATION: group into modules (Parcels/Finance/Insight/Settings) + module landing cards; acceptance: every page reachable ≤2 clicks from module home; see `09` |
| F-NAV-02 | Dead `/{section}/settings` link | `dashboard-shell.tsx:241` → zero `settings/page.tsx` | 404 on Profile & Settings | P1 | Add settings pages or remove link; acceptance: no nav link 404s (e2e `public-and-routes` extended) |
| F-NAV-03 | Bulk upload nav (`?mode=bulk`) ignored | `navigation.ts` + `merchant-dashboard.tsx:262` vs `booking-form` (no `mode` handling) | Users expect bulk, get single form | P1 | Either implement bulk (see `15`) or remove nav item; acceptance: nav matches capability |
| F-NAV-04 | Confusing labels: intelligence=`reports`, webhooks=`settings` | `navigation.ts` labelKeys vs `messages/en.json Nav` | Users cannot find features | P2 | Rename keys to `intelligence`/`webhooks`; acceptance: i18n unit updated |
| F-NAV-05 | Admin analytics nav 5/12 sections | `navigation.ts` vs `[section]/page.tsx TITLES` (12) | 7 sections hidden | P2 | Expose grouped analytics nav or module landing; acceptance: all valid sections linked |
| F-NAV-06 | Orphan intelligence/notifications/integrations/exceptions pages | `01§4` orphans | Admin/hub features undiscoverable | P1 | Add to nav groups per `09`; acceptance: nav coverage 100% of top-level pages |
| F-NAV-07 | Cross-namespace public `/track` from hub/rider shell | `navigation.ts TRACKING_ITEM= PUBLIC track` | Chrome jump (loses shell) | P3 | Keep (public API) but document; optionally add shell-wrapped `/hub/track` redirect; acceptance: back-nav consistent |
| F-NAV-08 | Duplicate analytics entry `/:locale/analytics` | `[locale]/analytics/page.tsx` role-switcher, no guard | Confusion + auth gap | P1 | Remove or redirect to role home; acceptance: single analytics per role |
| F-NAV-09 | No breadcrumbs on nested detail (`:id`, `bags/:id`, `manifests/:id`) | `parcel-details-view` uses `lastListUrl` back only | Lost context on deep link | P2 | Add breadcrumb (List › Details › Label); preserve list query; acceptance: deep link shows trail |

## B. UI/UX
| ID | Issue | Evidence | Impact | Severity | Proposal |
|---|---|---|---|---|---|
| F-UX-01 | No parcel edit/cancel UI (details read-only) | `parcel-details-view.tsx` (no edit mutation); `PATCH/DELETE /parcels/:id` absent in `parcels.controller.ts` | Cannot fix address/COD errors | P1 | Define edit policy (which statuses editable) + UI; acceptance: editable-field matrix in `11` |
| F-UX-02 | Static KPI strip on `/merchant/intelligence` | `intelligence` page hardcoded `64/64,240+,v1,100%` | Fake metrics erode trust | P1 | Bind to `GET /intelligence/health|metrics` or remove strip; acceptance: no hardcoded KPIs |
| F-UX-03 | `AdminConsole` placeholder (4 cards, no KPIs) | `features/admin/components/admin-console.tsx` (no API) | Admin lands on router, not overview | P2 | Replace with `AdminOverviewDashboard` summary or link module; acceptance: dashboard shows live counts |
| F-UX-04 | Unknown analytics `:section` renders empty, no 404 | `[section]/page.tsx` (no `notFound` on invalid) | Silent empty confuses | P2 | Validate + `notFound()`; acceptance: invalid section → 404 |
| F-UX-05 | `hub/parcels` lookup-only (no list) | `parcel-lookup-view.tsx` vs `useGetHubInventory` | Hub cannot browse inventory | P2 | Confirm intended; if list needed, add paginated hub inventory table; acceptance: spec in `11` |
| F-UX-06 | Destructive/financial confirms inconsistent | seal/dispatch/verify/payout-cancel use `ConfirmDialog`; delete webhook uses confirm; reversal/adjustment confirm assumed (verify) | Accidental money/state moves | P1 | Standardize confirm copy (amount + consequences) for all P0 money/state actions; acceptance: checklist in `15` |
| F-UX-07 | `rememberMe` UI-only | `login-form.tsx` (no persistence difference) | Misleading | P3 | Wire to refresh persistence or remove; acceptance: behavior matches label |
| F-UX-08 | `register` demands 6 fields incl. business/pickup | `register-form.tsx` | Friction; no progressive onboarding | P3 | Make business/pickup optional + profile completion later; acceptance: conversion spec |

## C. Frontend architecture
| ID | Issue | Evidence | Impact | Severity | Proposal |
|---|---|---|---|---|---|
| F-ARCH-01 | Client-only auth guard (flash + bypass via direct API) | `dashboard-shell.tsx:110-119` + `proxy.ts` (no server auth) | UX-only RBAC; deep-link flash | P2 | Keep backend authority; add server `proxy.ts` role check or loading skeleton to avoid flash; acceptance: no spinner→redirect flash on slow 3G |
| F-ARCH-02 | `asAppRole(unknown→MERCHANT)` default | `config/roles.ts:71-73` | Tampered role gets merchant surface | P2 | Default to CUSTOMER/public + login; acceptance: unit `roles-permissions` updated |
| F-ARCH-03 | Cache tags broad; polling (webhook deliveries 10s, bell count) may over-fetch | `lib/api/base-api.ts tagTypes`, `webhooks` page poll, `notification-bell` poll | Extra load | P3 | Scope invalidation per mutation; backoff polling when hidden; acceptance: network audit in devtools |
| F-ARCH-04 | URL state centralized (`useQueryState`) — good; but bulk `mode` + analytics section validation missing | `hooks/use-query-state.ts` vs booking/analytics pages | Inconsistent URL contracts | P2 | Centralize validators (see `10`); acceptance: unknown params ignored + tested |
| F-ARCH-05 | Shared primitives exist (`@dhruto/ui` + `feedback/states`, `data-display`, `filters`) — good; verify bundle (no oversized client components observed statically) | `packages/ui/src/*`, `components/*` | — | P3 (monitor) | Add bundle budget + `loading.tsx` per group; acceptance: `next build` sizes recorded in `18` |
| F-ARCH-06 | i18n coverage: `messages/en+bn.json` namespaces extensive; but route/i18n unit pins exist — verify runtime bn parity | `messages/*`, `tests/unit/*-i18n.test.ts` | Untranslated strings risk | P2 | Add missing-key lint + bn-spot e2e (already `*-bn-spot.spec.ts`); acceptance: `14` |

## D. What is good (preserve)
- `useQueryState` (typed get/set/reset, `scroll:false`, `resetPageKeys`) + `useDebouncedValue` + `DebouncedSearchInput` (`/` shortcut) — reuse for `10`.
- `lastListUrl` namespace-scoped back-nav; `useRouteBase` merchant/admin namespacing; `resolveRoute` whitelist for notification deep-links.
- `feedback/states` (Empty/Error/NotFound/Offline/Loading/Retry + skeletons) used consistently; `ConfirmDialog` for key destructive actions.
- `robots.ts` + per-page `robots:false` + `sitemap` (18 URLs) + PWA (manifest/sw/install-prompt/network-status) — solid foundation.
