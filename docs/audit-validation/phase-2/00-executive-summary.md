# Phase 2 — Executive Summary (audit & planning only, no code changed)

## Overall status
Phase 1 gate **PASSED** (code claims re-verified in tree; 103/103 gate tests green on disposable `dhruto_phase0`). Core money path remains intact (Phase 0 invariants preserved). The audit found **no new P0** beyond already-tracked Phase 1 items, but confirmed **one P1 notification-fan-out defect family (F-OBS-01 extended)** that silently drops most merchant/webhook notifications, plus several P1 gaps (bulk dead-nav, cancel endpoint missing, return initiation missing, unguarded prod demo-seed).

## Critical blockers (must resolve before production)
1. **F-OBS-01 extended (P1):** 12 of 13 domain-event publishers omit `payload.merchantId`, so the outbox relay silently skips webhook + merchant notification targets while marking rows PUBLISHED. Only `CASH_HAND_IN_SUBMITTED` fans out fully. Evidence: 123 `parcel.created.v1` PUBLISHED vs 0 deliveries/notifications; `notifications-webhooks` test 7 red on baseline too.
2. **Demo seed runs unguarded on every boot (P1):** `AuthService.onModuleInit → seedDemoData` (no `NODE_ENV` check) creates `admin@dhruto.com / dhruto123` ADMIN + merchant/rider/hub rows in ANY database the app boots against — including production.
3. **No return initiation path (P1):** RTO states exist in the state machine but no endpoint, UI, or publisher reaches them; failed parcels can loop `DELIVERY_ATTEMPTED ↔ OUT_FOR_DELIVERY` forever (no attempt cap).

## Workflow readiness matrix
| Workflow | Readiness | Headline |
|---|---|---|
| W1 Auth & users | READY with gaps | Phase 1 controls verified; logout/rotation + approval queue deferred; demo-seed P1 (see above) |
| W2 Onboarding & creation | PARTIAL | Single-parcel path VERIFIED; `?mode=bulk` dead nav + zero bulk API (P1); no merchant approval flow |
| W3 Lifecycle & tracking | READY with gaps | Full 21-state matrix VERIFIED; tracking projection safe; `CANCELLED` unreachable (no endpoint); assign/bag-add lack DTOs (P1) |
| W4 Rider & delivery | READY | OTP mandatory + exact COD VERIFIED; fail/reschedule VERIFIED; attempt-cap + photo rules need decisions |
| W5 Hub & sorting | READY with gaps | Bag/manifest/scan rules VERIFIED; exception re-resolve overwrite (P2); raw-body bag-add (P1) |
| W6 Finance & settlements | READY (Phase 0 holds) | Invariants preserved; `cancelSettlementBatch` orphan; zero-verify is a business rule, not a defect |
| W7 Returns & RTO | NOT READY | States + metrics exist; initiation, UI, fees, caps all missing |
| W8 Notifications & integrations | DEGRADED (P1) | Providers/retry/DLQ/fallbacks VERIFIED; fan-out payload omissions break most events; SMS/email are log stubs (no live provider configured) |
| W9 Analytics & reports | READY with gaps | Endpoints DB-derived; `activeRiders/Hubs:0` + `bottlenecks:[]` + hero statics are placeholder defects (P2); intel/alerts unscoped for hub managers |

## Recommended next phase
**Phase 3 — Notification fan-out repair + P1 workflow gaps** (NOT a new feature phase): single-point relay/payload fix for F-OBS-01, `NODE_ENV`-guard the demo seed, `AssignRiderDto` + bag-add DTO, exception resolve guard, analytics/intelligence placeholder literals → live or removed, cancel/return policy decisions with owner. Small reviewable slices with the regression suites from Phases 0–1. Details: `07-prioritized-implementation-roadmap.md`. Awaiting explicit owner approval — nothing implemented in this phase.
