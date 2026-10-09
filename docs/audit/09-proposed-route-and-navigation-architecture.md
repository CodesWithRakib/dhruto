# 09 — Proposed Route & Navigation Architecture (RECOMMENDATION)

> Do NOT implement yet. Uses existing App Router + `(group)` + `[locale]` conventions. Principles: no flat sidebar; module landing cards; actions where needed; no duplicate actions without benefit; breadcrumbs; nav-visibility ≠ authorization (backend `@Roles` stays authority); mobile parity.

## 1. Current tree (abridged, `/:locale` omitted)
```
 / + /track[/:code] + /services|pricing|about|contact|faq|privacy|terms + /login|register
 /merchant/dashboard|bookings/new(+?mode=bulk)|parcels[/:id[/label]]|finance|analytics|intelligence|notifications|developer/webhooks|track[/:code]
 /admin/dashboard|parcels[/:id[/label]]|finance|hub|rider|analytics[/:section]|intelligence|notifications|integrations|track[/:code]
 /hub/dashboard|scanner|parcels|bags[/:id]|manifests[/:id]|exceptions|cash|notifications
 /rider/dashboard|tasks[/:id]|history|profile|notifications
 /analytics (dup) | /offline | /* → 404
```
Problems: flat merchant nav (9/1 group); 8 orphans; dead `*/settings`; `?mode=bulk` fake; admin analytics 5/12; `AdminConsole` placeholder; `/analytics` dup + guard gap; no breadcrumbs; labels `reports/settings` confusing.

## 2. Proposed tree (same URLs unless Rename/Move noted; new = landing only)
```
 / (keep) + /track[/:code] (keep) + content pages (keep)
/merchant/
  dashboard (keep, enrich with needs-attention → parcels/finance links)
  parcels/            ← MODULE landing (NEW card page: All + Create + Bulk + Tracking + Returns summary)
    / (All Parcels, keep) | /:id (keep) | /:id/label (keep) | /new (ALIAS to bookings/new, keep bookings/new + redirect) | /bulk (NEW or remove nav) | /returns (NEW filtered view, reuses list)
  bookings/new (keep; bulk variant becomes /merchant/parcels/bulk)
  finance/            ← MODULE landing (keep page, add cards: Wallet + Payouts + Settlements + Reports)
  analytics (keep) | intelligence (keep, rename nav reports→intelligence) | track[/:code] (keep)
  notifications (MOVE into nav: MOVE from orphan → Settings group) | developer/webhooks (MOVE → Settings group, rename settings→webhooks) | settings/profile (NEW: merchant profile edit → PATCH /merchants/me; REPLACE dead link)
/admin/
  dashboard (REPLACE placeholder with live overview = AdminOverviewDashboard summary + links; keep URL)
  operations/         ← GROUP header (nav only, no page): parcels (keep) | hub (keep) | rider (keep) | exceptions? (NEW admin view reusing GET /exceptions?hubId — optional)
  finance (keep) | analytics[/:section] (keep URLs; nav EXPAND to grouped 12: Parcels/Delivery/Network/RTO/COD/Finance/System) | intelligence (MOVE orphan→nav) | integrations (MOVE orphan→nav) | notifications (MOVE orphan→nav) | track[/:code] (keep) | settings (NEW admin profile)
/hub/
  dashboard (keep) | scanner (keep) | parcels (keep lookup; ADD list tab per 11) | bags[/:id] (keep) | manifests[/:id] (keep) | exceptions (MOVE orphan→nav Operations) | cash (keep, rename nav Cash Desk) | notifications (MOVE orphan→nav) | track (REDIRECT /hub/track → /track, document chrome jump)
/rider/
  dashboard|tasks[/:id]|history|profile (keep) | notifications (MOVE orphan→nav More) | track (REDIRECT → /track)
```
Before/after: merchant 9-flat → 4 modules (Parcels/Finance/Insight/Settings) + dashboard; admin 5-groups keep + fill 3 orphans + expand analytics; hub/rider orphans → nav; `/analytics` → REMOVE (redirect to role home analytics); `*/settings` → CREATE (or remove links).

## 3. Role-specific nav maps (proposed)
- **MERCHANT:** Dashboard | Parcels (All/Create/Bulk/Returns/Tracking) | Finance (Wallet/Payouts/Settlements) | Insight (Analytics/Intelligence) | Settings (Notifications/Webhooks/Profile). Bottom: Dashboard/Parcels/Create/Finance.
- **ADMIN:** Overview | Operations (Parcels/Hub/Rider/Exceptions?) | Finance | Analytics (grouped 12) | Intelligence | Integrations | Notifications | Tracking. Bottom: Dashboard/Parcels/Finance/Hub.
- **HUB_MANAGER:** Operations (Dashboard/Scanner/Parcels/Bags/Manifests/Exceptions) | Cash Desk | Notifications. Bottom: Dashboard/Scanner/Bags/Manifests.
- **RIDER:** Home (Dashboard/Tasks/History/Profile) + More (Notifications, Tracking→public). Bottom: full 4.
- **CUSTOMER/public:** unchanged + mobile bottom nav (existing `PublicMobileBottomNav`).

## 4. Per-route disposition (selected; full table in `pages/`)
| Current | Proposed | Disposition | Roles | Nav | Migration/redirect | Deps/risks | Reason |
|---|---|---|---|---|---|---|---|
| `/merchant/bookings/new?mode=bulk` | `/merchant/parcels/bulk` (new) or remove | Move (or Remove) | MERCHANT | Parcels module | 308 `?mode=bulk` → `/bulk` (if built) | needs bulk API+job | nav must match capability |
| `/merchant/notifications` | same URL | Group (add to Settings) | MERCHANT | Settings | none | none | orphan fix |
| `/merchant/developer/webhooks` | same URL | Rename nav only | MERCHANT | Settings | none | i18n key rename | label fix |
| `/merchant/intelligence` nav `reports` | same URL | Rename nav only | MERCHANT | Insight | none | i18n | label fix |
| `/{section}/settings` (404) | `/{section}/settings/profile` (new) | Create (or remove links) | all authed | Settings/Profile | none | `PATCH /merchants/me` exists; need hub/rider profile PATCH (verify) | dead-link fix |
| `/admin/dashboard` | same URL | Replace content | ADMIN | Overview | none | bind overview queries | placeholder → live |
| `/admin/analytics/:section` (12) | same URLs | Expand nav | ADMIN | Analytics grouped | none | none | 7 hidden sections |
| `/admin/{intelligence,notifications,integrations}` | same URLs | Group into nav | ADMIN | respective groups | none | none | orphan fix |
| `/hub/exceptions`, `/hub/notifications` | same URLs | Group into nav | HUB | Operations/More | none | none | orphan fix |
| `/:locale/analytics` | REMOVE | Remove (redirect) | — | — | 308 → role analytics home | update role-switcher refs | dup + guard gap |
| `/hub/track`, `/rider/track` (absent) | REDIRECT → `/track` | Document (no new page) | HUB,RIDER | Network→public | none (nav already points public) | chrome jump accepted | avoid duplicate tracking shells |

## 5. Action placement + breadcrumbs + mobile
- Global nav: module destinations only. Module landing: summaries + primary CTA (Create/Request/Verify) + filters. List: bulk/filter/export/create. Detail: record actions (view/label, assign, resolve, approve). Edit/dialog: save/cancel. Context menu: secondary only.
- Breadcrumbs: `Parcels › {trackingCode} › Label`; `Bags › {bagCode}`; `Manifests › {code}`; preserve list query via `lastListUrl` (extend to hub/rider lists).
- Mobile: keep `MobileBottomNav` + `More` drawer; ensure new module landings are card-grids (thumb-reachable); scanner stays bottom-nav primary for hub; tasks stay primary for rider.
