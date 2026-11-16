# Release Blocker 01 — Test Report

Date: 2026-11-16 · Windows 11 · Node 26.8.1 · pnpm 12.4.2. Every result below comes from commands executed in this task after the dependency changes. Integration and browser runs used **disposable** resources only: databases `dhruto_test` and `dhruto_e2e_test` on the native PostgreSQL server (created for this task and dropped afterwards), logical Redis databases 14/15 on the dev Redis container (flushed afterwards), and one temporary LocalStack S3 container (removed). The development database `dhruto`, Redis db0 data, staging and production were not modified. No migration was applied to any shared or development database; the test harnesses migrate their own throwaway databases.

## 1. Audit gate

| Command                               | Before                                    | After                                        |
| ------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `pnpm audit --json` (repository root) | critical 4 · high 7 · moderate 13 · low 5 | **critical 0 · high 0** · moderate 9 · low 4 |
| `pnpm audit --audit-level high`       | exit 1                                    | **exit 0**                                   |

## 2. Static checks and builds

| Check                        | Command (abridged)                                                                        | Result                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts typecheck          | `tsc --noEmit` (packages/contracts)                                                       | Pass                                                                                                                                     |
| Contracts build              | `tsup` (`pnpm build`)                                                                     | Pass (cjs, esm, dts)                                                                                                                     |
| API typecheck                | `tsc --noEmit` (apps/api)                                                                 | Pass                                                                                                                                     |
| API build                    | `nest build`                                                                              | Pass; `require("xlsx").version` = 0.20.3                                                                                                 |
| Web typecheck                | `tsc --noEmit` (apps/web-merchant)                                                        | Pass                                                                                                                                     |
| UI package typecheck         | `tsc --noEmit` (packages/ui)                                                              | Pass                                                                                                                                     |
| Web production build         | `next build` (Next.js **16.4.6**, Turbopack)                                              | Pass (built twice: generic API URL, then the browser-test API URL)                                                                       |
| ESLint — contracts           | `eslint .`                                                                                | 0 problems                                                                                                                               |
| ESLint — API (changed areas) | `eslint src/chat/pipes src/chat/realtime src/riders/dto src/common/filters src/analytics` | 0 problems                                                                                                                               |
| ESLint — web                 | `eslint .` (with `@next/eslint-plugin-next` 16.4.6)                                       | 0 errors, 64 warnings — all in files not touched by this task (`react-hooks/exhaustive-deps`, `no-console` in two e2e walkthrough specs) |
| Prettier                     | `prettier --check` on every changed source file                                           | Pass                                                                                                                                     |

## 3. Unit / component / contract tests

| Suite              | Command                           | Result                                                   |
| ------------------ | --------------------------------- | -------------------------------------------------------- |
| Contracts          | `vitest run` (packages/contracts) | **77/77** (72 existing + 5 new in `zod4-compat.test.ts`) |
| API unit           | `vitest run src` (apps/api)       | **234/234**                                              |
| Web unit/component | `vitest run` (apps/web-merchant)  | **258/258**                                              |

All vitest runs above also exercise the `tinypool` 2.2.0 override (vitest 3.2.7 worker pool).

## 4. API integration (end-to-end against PostgreSQL/Redis)

### 4.1 Platform suites (24 files, non-chat)

`vitest run test/<non-chat>.e2e-spec.ts` with `DATABASE_URL` → `dhruto_e2e_test` (migrated with the repository migrations, seeded with the repository seed), `REDIS_URL` → Redis db 14.

| Run                                                  | Result                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All 24 files in one run                              | **185 passed, 7 failed** — all 7 failures are HTTP **429** from the per-user rate limiter (delivery 3, intelligence 1, parcels-cursor 1, scale-concurrency 2): every suite reuses the same seeded accounts and the Redis-backed counters carry over between suites run back-to-back |
| The 4 affected files, one by one with fresh counters | delivery **20/20**, intelligence **9/9**, parcels-cursor **1/1**, scale-concurrency **5/5**                                                                                                                                                                                         |

Covered: authentication/guards/rate limiting, merchant parcel core and ownership isolation, idempotency and concurrency, cancel/RTO, hubs, rider delivery/OTP/COD, finance ledger and payouts, analytics exports (including xlsx), notifications/webhooks, intelligence, validation hardening, Redis-down and multi-instance rate limiting.

### 4.2 Communication platform suites (7 files)

`vitest run test/chat-*.e2e-spec.ts --no-file-parallelism` with `CHAT_TEST_DATABASE_URL` → `dhruto_test`, `CHAT_TEST_REDIS_URL` → Redis db 15, `CHAT_TEST_S3_ENDPOINT` → LocalStack (signature validation on).

| Suite                 | Result                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------- |
| chat-foundation       | 32/32                                                                                         |
| chat-phase2           | 38/38                                                                                         |
| chat-logistics        | 17/17                                                                                         |
| chat-attachments      | 21/21                                                                                         |
| chat-admin-center     | 27/27                                                                                         |
| chat-phase8-hardening | 10 passed, 2 skipped                                                                          |
| chat-realtime         | 20 passed, **1 failed**, 1 skipped (first run); **21 passed, 1 skipped** on each of 3 re-runs |
| **Total (first run)** | **165 passed, 1 failed, 3 skipped (169)**                                                     |

- The realtime failure ("presence is multi-device safe…") saw one `offline` presence event while a second device was still connected; the test relies on a fixed 600 ms sleep across two instances. It passed on 3/3 isolated re-runs → intermittent timing flake (1 of 4 runs). It does not touch zod parsing. Recorded, not hidden.
- The 3 skips are the Redis outage / hung-Redis tests. They `docker stop`/`pause` the Redis container named by `CHAT_TEST_REDIS_CONTAINER`; this was deliberately left unset because the only Redis is the shared development container. Phase 8 executed these tests (169/169) on a disposable Redis; they were not re-executed here.

These suites cover upload reservation/completion/download, checksum-bound scan verdicts and fail-closed serving (fake clamd), internal-note privacy, admin moderation and grants, socket authentication, reconnect and cross-instance fan-out, and the mass-assignment (strict schema) checks under zod 4.

## 5. Browser (Playwright 1.63, `playwright.crossbrowser.config.ts`)

Stack: API (`node dist/main.js`, port 4100) on `dhruto_e2e_test` + Redis db 14 + LocalStack bucket with CORS; web production build (`next start`, port 3100, Next.js 16.4.6). **Scanner: the test suite's fake clamd run standalone — regression evidence only, not a production security claim** (no real ClamAV container was started, per the single-dev-stack constraint). Each chat spec run used a fresh parcel fixture.

| Spec                     | Chromium                        | Firefox                         | WebKit                                                                                                                            | Tablet  | Phone   |
| ------------------------ | ------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| chat-attachments (7)     | **7/7**                         | **7/7**                         | 1st: 2 passed, 1 failed (login), 4 not run → re-run **6 passed, 1 skipped** (voice: no fake mic in WebKit, same as Phase 8)       | —       | —       |
| chat-admin-center (10)   | 8 passed, 1 skipped, 1 failed ¹ | 8 passed, 1 skipped, 1 failed ¹ | runs 1–3 stopped at a login ² (run 2 additionally hit a stale report left by run 1 ³); run 4: **8 passed, 1 skipped, 1 failed ¹** | —       | —       |
| chat-responsive-a11y (3) | **3/3**                         | **3/3**                         | **3/3**                                                                                                                           | **3/3** | **3/3** |
| auth-session (2)         | **2/2**                         |                                 |                                                                                                                                   |         |         |
| merchant-login (3)       | **3/3**                         |                                 |                                                                                                                                   |         |         |
| rider-login (2)          | **2/2**                         |                                 |                                                                                                                                   |         |         |
| booking.smoke (1)        | **failed** ⁴                    |                                 |                                                                                                                                   |         |         |
| create-parcel (3)        | **3 failed** ⁴                  |                                 |                                                                                                                                   |         |         |

¹ Journey 9b (pause the real ClamAV container) is skipped without `CHAT_E2E_CLAMAV_CONTAINER`; journey 11 then fails only at its last assertion ("Restricted attachment accessed"), an audit entry that only 9b creates. Its intervention and escalation assertions pass. Environment dependency, identical on all three engines.

² **Pre-existing login race (Phase 8 F-UX-1), root cause identified.** `features/auth/components/login-form.tsx` uses controlled inputs (`useState("")`). If text is typed before React hydrates, `onChange` never fires; the next re-render (typing the password after hydration) writes the empty state back into the email field. Failure snapshot: email empty, password filled, alert "Please enter both email/phone and password". Probe: WebKit logins with the suites' exact steps succeeded 14/15, 30/30 and 11/12; in the failing case the email was already empty before the click. Not attributable to the Next.js upgrade on this evidence (the same race was recorded in Phase 8 on 16.3.8), but a timing change cannot be fully excluded. Product fix recommended (do not accept input before hydration, or read uncontrolled values on submit); not changed in this task.

³ Run 1 stopped before journey 8 resolved its report, so run 2 found two pending "Rude tone" reports (strict-mode locator). The stale test rows were resolved in the test database (the `CHK_chat_reports_review` constraint correctly required a reviewer) before run 4.

⁴ **Pre-existing UI defect, unrelated to this task.** The "Cash on delivery (BDT)" `<label for>` points at a wrapper `<div class="relative">` instead of the `<input>` (verified in the DOM). `FormControl` (Radix Slot) passes the field id to its first child. Introduced by commit `7451e3d` (2026-11-15, booking form modularization); `getByLabel` and assistive technology cannot associate the label. Not changed here (outside scope). **The booking flow itself was verified** with an equivalent Chromium probe that targets the COD input by name: quote shown, submit → success panel with tracking code, exactly one persisted parcel with matching tracking code, `CREATED`, canonical phone, numbers coerced (`codAmount` 1000, `weight` 1.5); invalid phone → "Invalid Bangladesh mobile number…" and no booking; empty submit → contract field messages — **9/9**.

## 6. Focused checks

| Check                                             | Result                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| SheetJS 0.20.3 write → read round-trip            | Identical (headers, Bengali text, numbers, nulls, CSV-sensitive characters); valid ZIP (`PK`) |
| zod 4 422 issue shapes                            | Custom messages preserved; default codes/messages differ (see remediation doc §3)             |
| Realtime invalid payload                          | Generic `INVALID_PAYLOAD` ack (no zod details exposed) — unchanged                            |
| Advisory GHSA-mrhx (bounded array, 200 000 items) | 1 `too_big` issue instead of one issue per element                                            |

## 7. Not executed / limitations

| Item                                                   | Reason                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Redis outage / hung-Redis integration tests (3)        | Would stop/pause the shared dev Redis; not authorized. Last executed in Phase 8.                  |
| Browser journey 9b (real ClamAV outage)                | No real ClamAV container (single-dev-stack constraint); fake clamd used for other journeys        |
| Real ClamAV verdicts                                   | Not re-run; scanner adapter code unchanged in this task                                           |
| Real storage provider                                  | Out of scope (separate blocker); emulator only                                                    |
| Other Playwright specs (hub, finance, rider, mobile …) | Not run; the chat, auth and booking journeys most exposed to the upgraded libraries were selected |
| Staging/production                                     | Not authorized                                                                                    |

## 8. Environment notes (honest account)

1. vitest must run from an uppercase `C:\` working directory on this machine: from a lowercase `c:` cwd, `@nestjs/core` is loaded twice under two path keys and every AppModule-based suite fails in `beforeAll` ("Nest can't resolve dependencies of the RateLimitGuard"). Diagnosed with a temporary probe test (deleted). Not a product or dependency issue; the first platform run (24 files failed) was discarded for this reason and repeated.
2. Seeding a migration-built database requires the pre-existing `delivery_otp_code` drift column; it was added **only** to the throwaway `dhruto_e2e_test` (same workaround as Phase 7/8). No migration or repository code was changed for it.
3. The first migrate and seed invocations against `dhruto_e2e_test` were run without a Redis override, so the booting app context briefly connected to the dev Redis (db0) from `apps/api/.env`. No test data was written there; BullMQ scheduler registration may have refreshed the same scheduler keys the dev API maintains. Later commands used Redis db 14/15 explicitly.
4. Port 4566 is reserved on this Windows host; LocalStack was mapped to 14566.

## 9. Git workspace status

No `git add`, commit, reset, checkout or clean was run. During the task every changed and new file of this work appeared **staged** in the index although no staging command was issued (external auto-staging, as in Phase 8). Phase 8 itself had been committed as `8de0402` (21:11) before this task started. Files changed by this task: 6 manifests/workspace files, `pnpm-lock.yaml`, 13 contract source files + 1 new test, 3 API source files, 5 web source files, 3 new documents. Changes made after the last auto-staging event (if any) are unstaged — review `git status` before committing.
