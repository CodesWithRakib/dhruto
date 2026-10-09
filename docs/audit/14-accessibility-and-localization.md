# 14 — Accessibility & Localization

## 1. What exists (preserve)
- `next-intl` routing (`en|bn`, default `en`): `src/i18n/routing.ts`, `request.ts` (locale validate + fallback + `messages/${locale}.json`), `proxy.ts` intl middleware, `lib/navigation.ts` locale-relative links.
- Fonts with Bangla coverage: `Inter/Plus_Jakarta_Sans/Instrument_Serif/Hind_Siliguri/Noto_Sans_Bengali` + `font-bangla` when `bn` (`app/[locale]/layout.tsx`).
- `messages/en.json` + `bn.json` namespaces: Index/Auth/BookingForm/ParcelList/ParcelDetails/ShippingLabel/Tracking/Hub/Rider/Finance/Webhooks/Notifications/AddressConfirmation/ParcelIntelligence/AdminIntelligence/NotificationPreferences/AdminIntegrations/Intelligence/Nav/Footer/Home/Services/Pricing/About/Contact/Faq/Privacy/Terms/Analytics*/States/DataTable/Offline/ApiErrors.
- Primitives: Radix (`label/select/slot`), `Label`, focusable shells, `MobileBottomNav` + drawer with `Escape` handler, `main#main-content`, PWA install/network/offline states.
- Tests: `*-i18n.test.ts` (route/nav/dashboard/parcel/hub/rider/finance), `dashboard-overview-i18n`, `*-bn-spot.spec.ts` (hub/rider/finance), `mobile/*` specs.

## 2. Findings
| ID | Finding | Evidence | Severity | Proposal / acceptance |
|---|---|---|---|---|
| A-01 | No axe/lighthouse CI gate observed | `ci.yml` (quality + e2e only) | P2 | Add `axe-playwright` on 5 critical pages (login, booking, parcels, tasks, finance) + contrast budget; acceptance: 0 critical violations |
| A-02 | Keyboard/focus: drawer `Escape` exists; verify focus-trap + return-focus + skip-link | `dashboard-shell.tsx` (Escape only observed) | P2 | Add focus-trap + `Skip to content` + visible focus; acceptance: keyboard-only task pass |
| A-03 | Form labels: Radix `Label` used; verify every input has associated label + error `aria-describedby` | `booking-form`, `login/register-form` (not fully traced) | P2 | Audit 3 forms; acceptance: screen-reader pass |
| A-04 | Status conveyed by color + text? `status.ts` tones + badges carry text (good); verify chart alternatives | `status-badge/tone-badge/enum-badge`, `charts.tsx` | P3 | Add data tables/alt-text for charts; acceptance: no color-only meaning |
| A-05 | Touch targets on mobile bottom nav + scanner (verify ≥44px) | `mobile-bottom-nav.tsx`, `hub-scanner` | P2 | Measure Pixel5 specs (already mobile projects); acceptance: targets pass |
| A-06 | bn parity: namespaces extensive but runtime missing-key fallback = `en` (silent); `Nav.bulkUpload` etc. untranslated risk | `request.ts` fallback, `messages/*` | P2 | Add missing-key lint (`en` vs `bn` key diff) + extend bn-spot e2e to booking/parcels; acceptance: 0 missing keys |
| A-07 | Timezone: `formatDate/Time Asia/Dhaka` in `lib/format.ts` (good); verify analytics `timezone` param honored + stored `timestamptz` rendered consistently | `lib/format.ts`, `AnalyticsRangeQueryDto.timezone` | P2 | Add tz test (Dhaka vs UTC renders); acceptance: `14` + e2e |
| A-08 | Currency: `formatBDT ৳` (good); verify minor→major consistent after money unification | `lib/format.ts`, `06§3` | P2 | Bind to `money.ts` helpers; acceptance: no `৳x.999` drift |
| A-09 | Error/empty states bilingual? `error.tsx` inline bilingual (good); verify `ErrorState/EmptyState` use `States` namespace both locales | `[locale]/error.tsx`, `feedback/states.tsx` | P3 | Spot-check bn error/empty snapshots |
| A-10 | Reduced-motion + `prefers-contrast` for marketing animations (`reveal`, marquee, stacking) | `marketing/*` animations | P3 | Honor `prefers-reduced-motion`; acceptance: no auto-motion when set |

## 3. Recommendations (all P2/P3, after P0/P1)
Add a11y + i18n gates to `quality` (axe + key-diff + `format:check` already exists), keep `font-bangla`, document `Asia/Dhaka` canonical tz + `৳` formatting contract in `@dhruto/contracts` (display helper, not stored unit).
