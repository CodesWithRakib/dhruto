# 13 — Security, Performance & Operations (P0–P3)

> Evidence paths + real impact (no speculative criticals). Key names only, never values.

## P0 — Critical (immediate security / money / loss risk)
| ID | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| S-P0-01 | Self-register any role (`ADMIN/HUB_MANAGER/RIDER`) | `auth.dto.ts:44-47 @IsEnum(UserRole)`, `auth.service.ts:205` (frontend pins MERCHANT but backend doesn't) | Privilege escalation | Allowlist `MERCHANT` (+`RIDER` with approval?) or admin-invite; add TC-AUTH-002 |
| S-P0-02 | No `@RateLimit` on `POST /auth/*` | `auth.controller.ts:16-79` vs all other sensitive routes with `@RateLimit` | Credential stuffing/brute-force | Add login/register/refresh limits + tests (violates `docs/10-SECURITY§3`) |
| S-P0-03 | Real `.env` files committed | `/.env`, `/.env.prod`, `/apps/api/.env`, `/apps/web-merchant/.env.local` exist vs `10-SECURITY§11 Never commit secrets`, `12-DEPLOYMENT§3` | Secret leak | Rotate exposed secrets; git-ignore + secret manager; add secret-scan CI |
| S-P0-04 | Guards not global (`APP_GUARD` absent) | `app.module.ts:60-81` (only PIPE/FILTER/INTERCEPTOR) + per-controller `@UseGuards` | New controller can ship open | Add `APP_GUARD JwtAuthGuard+RolesGuard` default-deny (keep `@Public` escape) + arch test |
| S-P0-05 | Ledger invariant unverified here (no test execution) | `ledger.service.ts`, `finance-ledger.e2e` (13, not run) | Money correctness unconfirmed in this pass | Run `finance-ledger.e2e` + `finance.e2e` first (Phase 0 of `16`); never delete ledger rows (verify no `remove()`) |

## P1 — High
| ID | Finding | Evidence | Impact |
|---|---|---|---|
| S-P1-01 | No refresh rotation/revocation; logout no-op | `auth.service.ts:350`, `auth.controller.ts:79-96` vs `10-SECURITY§1` | Stolen refresh valid 7d |
| S-P1-02 | Custom JWT + dev-secret fallback | `custom-jwt.service.ts:17-23`, `auth.config.ts:11-14` | Boots prod with known secret if env missing → fail-closed required |
| S-P1-03 | Raw-body endpoints skip validation (assign-rider, bag-add) | `parcels.controller.ts:255 @Body("riderId")`, `hubs.controller.ts:278-291 @Body("parcelTrackingCode")` vs `hub.dto.ts:48 AddParcelToBagDto` | Invalid UUIDs reach service; no 422 shape |
| S-P1-04 | `RateLimitGuard` memory `inFlight` + best-effort cache | `rate-limit.guard.ts:40,57-68` (fail-open comment) | Multi-instance bypass; cache loss = limit loss |
| S-P1-05 | Money dual units (decimal vs minor) | `06§3` (Wallet decimal vs ledger minor) | Rounding drift; unify reads (minor canonical) |
| S-P1-06 | `/:locale/analytics` unguarded role-switcher | `[locale]/analytics/page.tsx` (only MERCHANT check) | Non-merchant sees admin view |
| S-P1-07 | Body `1mb` + `statement_timeout 30s` vs bulk/export needs | `main.ts:31-32`, `database.config.ts:30`, `11-TESTING§5 bulk` | Legit bulk/export 422/timeout |
| S-P1-08 | `CacheService.getHealth` always healthy | `cache.service.ts:239` → `health.controller.ts:79 readiness` always ready | Readiness lies when Redis down |
| S-P1-09 | Static KPIs (`merchant/intelligence`, `buildOverview 0s`) | `04 F-UX-02`, `analytics.controller.ts:354` | Fake metrics; trust + decision risk |

## P2 — Medium
S-P2-01 Public `GET /health|/metrics|prometheus` unauthenticated, no rate-limit (`health.controller.ts`) → recon; gate `metrics/prometheus` or rate-limit. S-P2-02 `VerifyCashLedgerDto.actualAmount @IsPositive` blocks zero (confirm rule). S-P2-03 Analytics dual shapes (legacy `period` vs range) → deprecate legacy. S-P2-04 Webhook `events string[]` vs enum; SMS phone vs BD regex; pricing `codAmount` optional — DTO fixes. S-P2-05 `asAppRole→MERCHANT` default → CUSTOMER default. S-P2-06 `CUSTOMER` dead-end + `HUB_MANAGER` seed w/o assignment → onboarding docs/seeds. S-P2-07 `NEXT_PUBLIC_SITE_URL` undocumented; `apps/api/.env` missing pool/timeout/outbox/provider/pepper keys → env parity table + startup assert. S-P2-08 `system/*` double-prefix check (`main.ts:35` excludes `health` only, controller has `["health","system"]`). S-P2-09 `QueuesModule` 2 queues vs 3rd processor (`analytics-exports`) — verify binding. S-P2-10 `void riderId` + unused `created` (rider scoping incomplete). S-P2-11 No `Dockerfile`/K8s/rollback artifacts vs `12-DEPLOYMENT§7,14` → add minimal images + migration rules. S-P2-12 `AddressAlias.placeId` no FK. S-P2-13 `cancelSettlementBatch` orphan.

## P3 — Low
S-P3-01 `CashHandInStatus` dual definitions (entity vs contracts; `index.ts:23-27` omits star-export deliberately — keep, add lint). S-P3-02 Health route doubling (`health`+`system` ×5). S-P3-03 `rememberMe` UI-only. S-P3-04 Bundle budget unrecorded (add `next build` sizes).

## Performance / ops notes
- Pool `max20/min2`, `max_connections=100` (4 instances + workers + psql headroom — `docker-compose.yml:6-8` comment) — coherent; add pool-exhaustion alert.
- Telemetry in-memory p50/p95/p99 + RPS (`telemetry.interceptor.ts`); Prometheus text (`health.controller.ts:165`); targets `250RPS p95<300ms err<1%` (`11-TESTING`) + `scripts/load-test.ts|load-baseline.mjs` — run in staging (task).
- Logging JSON (`logging.interceptor.ts`) + `X-Request-Id` (middleware) + envelope — good; ensure no secrets/PII in logs (auth-token doc rule).
- Backups/recovery per `14-DISASTER-RECOVERY.md` + `runbooks.md` (preserved; not re-audited deeply — see `18` limits).
