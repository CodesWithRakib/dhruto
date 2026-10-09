# Phase 2 — 02 Workflow Matrix (W1–W9)

> Classes: VERIFIED / DEFECT_CONFIRMED / PARTIAL / NOT_IMPLEMENTED / NOT_TESTED / BUSINESS_DECISION_REQUIRED / BLOCKED. Priorities P0–P3. Tests marked (RERUN) were executed in Phase 2 gate; others cite existing files without re-execution.

## W1 — Authentication & User Management
| Area | Status | Priority | Evidence |
|---|---|---|---|
| Public register merchant-only; ADMIN/HUB/RIDER/CUSTOMER → 403; invalid → 422 | VERIFIED | — | `auth.service.ts:206-211`; `auth-and-rider.e2e` (RERUN 14/14) |
| Login/bcrypt/inactive-suspend 401; 15m/7d tokens; type-checked access/refresh | VERIFIED | — | `auth.service.ts:286-303`; `custom-jwt.service.spec` (existing) |
| Rate limits 10/60/60 + 429 shape + independence, no lockout | VERIFIED | — | `auth.controller.ts:21,48,72`; `auth-rate-limit` (RERUN 3/3) |
| Global JwtAuthGuard + RolesGuard; health/tracking/auth public; cross-tenant 403/404 | VERIFIED | — | `app.module.ts:73-78`; `auth-guards` (RERUN 7/7) |
| Fail-closed prod JWT config | VERIFIED | — | `auth.config.ts:19-48`; `auth.config.spec` (existing) |
| Logout no-op + no refresh rotation/revocation | PARTIAL (deferred T-AUTH-01) | P1 | `auth.controller.ts:79-96`; Phase 1 scope exclusion |
| Merchant onboarding approval queue | NOT_IMPLEMENTED | P2 | `register()` sets `ACTIVE` immediately, `auth.service.ts:207-215`; no approval entity/endpoint |
| **Demo seed unguarded on every boot (creates known-password ADMIN in any DB)** | DEFECT_CONFIRMED | P1 | `auth.service.ts:63-69` `onModuleInit` → `seedDemoData:71-187`, no `NODE_ENV` check |
| No distinct super-admin role (ADMIN is top, bypasses RolesGuard) | VERIFIED (by design) | — | `roles.guard.ts:29`; note, not defect |
| User activation/suspension admin API | NOT_TESTED | P2 | `UserStatus` enforced at login; no suspend/activate endpoint found |

## W2 — Merchant Onboarding & Parcel Creation
| Area | Status | Priority | Evidence |
|---|---|---|---|
| Single-parcel validation (DTO mirrors Zod contract), server-side pricing, atomic create + history + outbox, `PARCEL_CREATE` idempotency | VERIFIED | — | `create-parcel.dto.ts:17-94`; `parcels.service.ts:242-261,327-427`; `parcels` e2e (RERUN 29/29) |
| Idempotency key length 16–128 documented but not enforced at runtime | PARTIAL | P3 | `parcels.controller.ts:68` vs `:90`; `IdempotencyRecord.entity.ts:15-16` |
| **`?mode=bulk` dead nav; zero bulk UI/API** | DEFECT_CONFIRMED + NOT_IMPLEMENTED | P1 | `navigation.ts:67-68` + dashboard `futureFeature` badge vs `bookings/new/page.tsx:1-26` (ignores query); backend grep `bulk` = ∅ |
| Merchant profile edit API exists; pickup address free-text (no geo check at booking) | PARTIAL | P2 | `merchants.controller.ts`; no settings page (prior finding) |
| No approval/onboarding workflow beyond instant ACTIVE | NOT_IMPLEMENTED | P2 | same as W1 |

## W3 — Parcel Lifecycle & Tracking
| Area | Status | Priority | Evidence |
|---|---|---|---|
| 21-state transition matrix + 2 code-gated exceptions + terminal states | VERIFIED | — | `parcel-lifecycle.service.ts:25-113`; `lifecycle.spec` (existing) |
| `CANCELLED` allowed by matrix but **no cancel endpoint/role** | NOT_IMPLEMENTED | P1 | no `cancel` in `parcels.controller/service.ts`; needs policy (see `05`) |
| Assign/reassign guards (operable rider, same-hub, state gate, reassign audit) | VERIFIED | — | `parcels.service.ts:752-918`; `delivery` e2e (RERUN 19/19) |
| **Raw-body `assign-rider` + `bag-add` bypass DTO validation** | DEFECT_CONFIRMED | P1 | `parcels.controller.ts:255` `@Body("riderId")`; `hubs.controller.ts:286` `@Body("parcelTrackingCode")`; unused `hub.dto.ts:48-56` |
| Reassign bypasses public matrix (DELIVERY_ATTEMPTED/RESCHEDULED→ASSIGNED) | PARTIAL | P2 | `parcels.service.ts:829-844`; needs intent confirmation |
| Public tracking projection (8 fields; no PII/money; masked phone; EN/BN timeline) | VERIFIED | — | `tracking.controller.ts:16-56`; `parcel-details-response.dto.ts:52-79` |
| Authenticated details/label scoping (ownership 404) | VERIFIED | — | `parcels.service.ts:597-636`; guards e2e cross-merchant (RERUN) |
| Frontend status config covers all 21 states; filters/timeline consistent | VERIFIED | — | `web-merchant/config/status.ts:50-147` |

## W4 — Rider Operations & Delivery
| Area | Status | Priority | Evidence |
|---|---|---|---|
| OTP (6-digit, TTL 15m, 5 attempts, 60s cooldown, 5/leg) mandatory for completion; exact COD match in minor units | VERIFIED | — | `riders.service.ts:636-682,724-751,811-837`; `delivery` e2e (RERUN) |
| Fail reasons (7-enum), reschedule ≤7d future-only, attempt rows + history | VERIFIED | — | `rider-delivery.dto.ts:68-86`; `riders.service.ts:1027-1148` |
| Duty OFF blocked with OUT_FOR_DELIVERY; hand-in custody chain; PoD attempt+history+ledger | VERIFIED | — | `riders.service.ts:427-436,1162-1341`; `completeDelivery:840-963` |
| No delivery-attempt cap (infinite fail→start→fail loops) | PARTIAL | P2 | no cap in `failDelivery`; see `05` decision |
| Duty gate counts only OUT_FOR_DELIVERY (assigned-not-started don't block OFF) | PARTIAL | P3 | `riders.service.ts:429` |
| Photo proof optional + URL-syntax-only | BUSINESS_DECISION_REQUIRED | P3 | `CompleteDeliveryDto` `proofPhotoUrl?` |
| Offline mutation queue | NOT_IMPLEMENTED by design | — | `sw.js` network-only for mutations; idempotency keys compensate; VERIFIED no stale-write risk |

## W5 — Hub & Sorting Operations
| Area | Status | Priority | Evidence |
|---|---|---|---|
| Bag OPEN→SEALED→IN_TRANSIT→RECEIVED; seal requires ≥1 parcel; sealed immutable; no unseal/delete | VERIFIED | — | `hubs.service.ts:779-809,1023-1076,1548,1590`; `hubs` e2e (RERUN 9/9) |
| Manifest create (sealed-only) → dispatch-once → receive with partial flag; mismatch exceptions | VERIFIED | — | `hubs.service.ts:1082-1186,1274-1359,1368-1516` |
| Scans append-only incl. DUPLICATE/REJECTED; idempotent replay; per-hub authz | VERIFIED | — | `hubs.service.ts:298-347,1711-1766` |
| Exception auto-create (duplicate/unexpected/missing/wrong-dest) + manual; hub-scoped resolve + note | VERIFIED | — | `hubs.service.ts:390-397,1404-1444,1599-1617` |
| **Re-resolve overwrites silently (no already-resolved guard)** | DEFECT_CONFIRMED | P2 | `hubs.service.ts:1639-1643` |
| Raw-body bag-add (see W3) | DEFECT_CONFIRMED | P1 | `hubs.controller.ts:286` |

## W6 — Finance, COD & Settlements (Phase 0 baseline holds)
| Area | Status | Priority | Evidence |
|---|---|---|---|
| Balanced atomic journals; verify→settle→batch→payout chain; payout state machine; idempotent + concurrent-safe; reversal compensating postings | VERIFIED | — | Phase 0 doc; `finance-ledger` 13 + `finance` 9 (RERUN green) |
| Minor-unit math at boundaries (`toMinor` in, integer math, `toMajor` out, same tx); inputs 2dp so round-trips exact | VERIFIED (residual P2) | P2 | `finance.service.ts:283-294,338-346,837-855`; T-FIN-01 unification still desirable |
| `cancelSettlementBatch` service method with no route | PARTIAL (orphan) | P2 | `finance.service.ts:1270`; no controller route |
| **Zero-amount verify (`actualAmount: 0` → 422 via `@IsPositive`)** | BUSINESS_DECISION_REQUIRED | P2 | `finance.dto.ts:97-101`; omitted field OK (defaults to expected) |
| Merchant refunds (beyond payout-reject compensations) | NOT_IMPLEMENTED | P2 | only `PAYOUT_REFUND` postings exist |
| Finance files untouched by Phase 1 (payload/relay files unmodified) | VERIFIED | — | git status: `finance.service.ts`, `outbox-relay.service.ts`, `riders.service.ts` unmodified |

## W7 — Returns, Failed Delivery & RTO
| Area | Status | Priority | Evidence |
|---|---|---|---|
| RTO chain in machine (`DELIVERY_ATTEMPTED→RTO_INITIATED→RETURN_IN_TRANSIT→RETURNED_TO_MERCHANT`) + RTO metrics endpoints DB-derived | VERIFIED | — | `lifecycle:66-77`; `analytics-domain.service.ts:82-243` |
| **No return initiation endpoint; `PARCEL_RETURNED` event has zero publishers; no return UI** | NOT_IMPLEMENTED | P1 | controller surface audit; publisher grep ∅ |
| Failed reasons + reschedule mechanics | VERIFIED | — | see W4 |
| No attempt cap / auto-RTO escalation | PARTIAL | P2 | see `05` |
| Return fees / COD reversal on return | NOT_IMPLEMENTED (by design note) | P2 | `analytics.controller.ts:581` explicit non-tracking; needs decision |

## W8 — Notifications & Integrations
| Area | Status | Priority | Evidence |
|---|---|---|---|
| **F-OBS-01 extended: 12/13 publishers omit `payload.merchantId` → relay silently skips webhook+merchant targets (rows still PUBLISHED)** | DEFECT_CONFIRMED | P1 | `domain-event-publisher.service.ts:35-41` vs `outbox-relay.service.ts:570,654-656`; per-site table in `03`; only `CASH_HAND_IN_SUBMITTED` fully fans out |
| `PARCEL_RETURNED` / `DISCREPANCY_RESOLVED` never emitted | NOT_IMPLEMENTED / by-design | P3 | publisher grep ∅ |
| SMS/email provider abstraction (log vs http on `*_PROVIDER_URL+KEY`; bodies never logged) | VERIFIED | — | `providers.ts:84-287`; no live provider configured (log mode) |
| Outbound webhook HMAC + SSRF guard + secret masking; retry/backoff/DLQ/admin replay | VERIFIED | — | `webhooks.service.ts:103-120,429-456,618-649` |
| BullMQ attempts + `enqueueOrInline` + sweeper + memory-fallback cache | VERIFIED | — | `queue-helper.ts:18-67`; live Redis-down NOT_TESTED |

## W9 — Analytics, Reports & Visibility
| Area | Status | Priority | Evidence |
|---|---|---|---|
| 24/26 endpoints DB-derived (funnel/latency/rider/hub/merchant/RTO/COD/finance/alerts/reports) | VERIFIED | — | `analytics-metrics/domain/service.ts`; `analytics` e2e (existing, not rerun) |
| **`activeRiders:0, activeHubs:0` + `bottlenecks:[]` literals; intelligence hero `64/64, 240+, 100%` statics** | DEFECT_CONFIRMED | P2 | `analytics.controller.ts:352-353,409`; `merchant/intelligence/page.tsx:59-86` |
| Merchant/hub query-layer tenant scoping; export TTL/ownership; alert rules/dedup/ack | VERIFIED | — | `analytics.controller.ts:120-156,775-789`; `analytics-export.service.ts`; `analytics-alert.service.ts` |
| Hub-manager platform-wide intelligence + alerts list (unscoped) | PARTIAL | P2 | `analytics.controller.ts:670-703`; needs scoping decision |
| Asia/Dhaka buckets + BDT minor/major handling | VERIFIED | — | `analytics-range.service.ts`; `phase7.schema.ts:8-10` |
