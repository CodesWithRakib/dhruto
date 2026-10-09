# Test Cases — Notifications/Webhooks (F14–F16) + Intelligence/Analytics (F17/F18) + Security + Frontend — selected

## Notifications/webhooks
| ID | Steps → expected | Automation | Status |
|---|---|---|---|
| TC-NOT-001 Prefs `GET\|POST /preferences` (1-20, en\|bn) honored; bell count polls; `resolveRoute` whitelist safe | web notif specs (none dedicated — NEW e2e) | partial |
| TC-NOT-002 Transports: provider keys absent → log fallback (Blocked real send); template renders bn/en | `templates.spec` (9), `providers.spec` (11) | existing-unverified |
| TC-WEB-001 CRUD + rotate (old invalid) + ping + deliveries filter + replay; `events string[]` → after fix enum-validated; HMAC `X-Dhruto-Signature` + timestamp + replay guard | `webhook-security` (9), `url-safety` (7), `notifications-webhooks.e2e` (9) | existing-unverified |
| TC-INT-001 DLQ/outbox: fail → `IntegrationFailure` → replay/resolve; `EventOutbox SKIP LOCKED` fan-out; `enqueueOrInline` when Redis down | `notifications-webhooks.e2e` | existing-unverified |

## Intelligence/analytics
| ID | Steps → expected | Automation | Status |
|---|---|---|---|
| TC-INTEL-001 Parse/confirm/risk/RTO/geo-search/import (`districts=64 version=bd-geo-2026-10`); HMAC-only phones; bias assert (no religion/ethnicity/health) | `intelligence.e2e` (9), v2 (10), 5 unit (33) | existing-unverified |
| TC-ANA-001 Tenant isolation + role deny + KPIs/deltas + funnel + RTO/COD + alerts + CSV/XLSX; range guard presets/tz | `analytics.e2e` (11), `analytics-range` (9) | existing-unverified |
| TC-ANA-002 Unknown `:section` → after fix 404 (today empty); `/analytics` dup → after fix redirect/guard | NEW | missing |

## Security/resilience (cross-cutting)
TC-SEC-001 Cross-tenant (parcels/finance/notif/webhooks/intel/analytics) → 403/404. Existing e2e assert (parcels/analytics/scale-concurrency) — existing-unverified. TC-SEC-002 Hub perm matrix (8 perms × grant/deny). Partial (hubs e2e covers ops, needs matrix). TC-SEC-003 Fuzz enums/cursor/pagination (`sort`, `status`, `cursor` tamper → 400). Missing. TC-SEC-004 Concurrency (complete/verify/payout same-Key + parallel) → single win. Existing (`scale-concurrency` 5, ledger 13) — existing-unverified. TC-SEC-005 Rate-limit (after auth limit added) incl. `Retry-After` + multi-instance note. Missing. TC-SEC-006 PII: public tracking masked (no ids/money/notes/audit); admin exports perm-gated. Existing-unverified. TC-SEC-007 Provider/Redis-down fallbacks (inline + memory) + health `readiness 503`. Partial (`observability.e2e` 6).

## Frontend UX
TC-UI-001 Forms (RHF+Zod, inline errors, `confirming/calculating` states). `booking-form.test`, `create-parcel.spec`. TC-UI-002 Tables (sort/filter/pagination + URL + skeletons/empty/error). `parcel-list-view`, `query-state`, `data-table-labels`. TC-UI-003 Role visibility (nav + `*/settings` 404 today). `roles-permissions`, `hub/rider/finance-routes`. TC-UI-004 i18n bn/en parity + `font-bangla`. `*-i18n` unit + `*-bn-spot` e2e. TC-UI-005 Mobile (bottom nav + sheets + scanner/tasks). `mobile/*` (11). TC-UI-006 A11y (labels, focus, keyboard, contrast — see `14`). Partial (no axe job).
