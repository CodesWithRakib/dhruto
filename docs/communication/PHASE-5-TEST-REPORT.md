# Communication Platform — Phase 5 Test Report

Date: 2026-11-16 · Windows 11, pnpm workspace. Every result below comes from a command executed in this phase. Integration suites ran only against **fresh disposable** `postgres:16-alpine` + `redis:7-alpine` containers (`dhruto-p5-test-*`, database `dhruto_chat_test`), removed afterwards.

## 1. Results

| Check                                                               | Result                                                                       |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Contracts tests                                                     | **Pass** — 4 files, 58/58                                                    |
| Contracts typecheck / lint / build                                  | **Pass** (`tsc --noEmit` 0, `eslint .` 0, `tsup` build OK)                   |
| API typecheck (`tsc --noEmit`, `src`)                               | **Pass**                                                                     |
| API unit specs (`vitest run src`)                                   | **Pass** — 26 files, 208/208                                                 |
| API chat integration (foundation, phase 2, realtime, **logistics**) | **Pass** — 108 passed, 1 skipped (109)                                       |
| API lint, changed files                                             | **Pass** (0 problems)                                                        |
| API lint, whole app                                                 | 1 error — **pre-existing** `src/main.ts:90` (`no-explicit-any`), unchanged   |
| Web typecheck                                                       | **Pass**                                                                     |
| Web lint                                                            | **Pass** — 0 errors; 67 warnings, all pre-existing (changed files clean)     |
| Web production build                                                | **Pass** (after fixing a test-file type error the build's type check caught) |
| Web unit/component tests                                            | **Pass** — 41 files, 230/230 (216 before + 14 new)                           |
| Playwright E2E                                                      | **Not executed** (§3)                                                        |
| `notifications-webhooks.e2e-spec.ts`                                | **Not executed** (§3)                                                        |

The single skip is the Redis outage/recovery case (needs `CHAT_TEST_REDIS_CONTAINER`), unchanged since Phase 3. "outbox down" log lines come from intentional failure-injection tests.

## 2. New tests

**`apps/api/test/chat-logistics.e2e-spec.ts` (17)** — real `POST /parcels/:id/assign-rider` → outbox → relay → handler → realtime:

- get-or-create: created once, same thread for merchant / customer / hub manager; **concurrent** 8 requests → exactly one row and one 201;
- rejection (422, no enumeration) and 404 for another merchant, other hub's manager, unassigned rider, other-hub rider, **different-format phone account**;
- parcel context present, no recipient phone/address in list/detail;
- committed assignment admits the rider + one `parcel.rider_assigned` message; **outbox retry** of the same event → still one message (`client_message_id` = event id);
- **reassignment**: old rider 404 immediately (live), row `REMOVED` with workflow audit (no actor), `membership:revoked` on the old rider's socket with revalidation disabled, 404 on detail / history / single message, socket rejoin refused; new rider ACTIVE; old rider's message keeps author and content; one `parcel.rider_reassigned`;
- reassigned back → re-admitted; **moderator-removed rider is never re-admitted** (403 on get-or-create);
- concurrent duplicate reassignment → 200 + 409, converges to one ACTIVE rider, one message per event;
- hub transfer: old hub manager 404, new hub manager joins, old row `REMOVED`;
- admin without reason → 422 `CHAT_REASON_REQUIRED` (no membership), short reason → 422, with reason → `ADMIN_INTERVENTION` audit (reason, `ADMIN`, `via: get_or_create`) + one "staff joined" notice, no second intervention when already a member;
- merchant desk: other merchant 404, admin join needs reason, internal note never returned to the merchant, staff message visible;
- **rolled-back** transaction with a published parcel event → no message; committed failure event → one message with only `trackingCode` + enum `reason`, visible to the customer, nothing stuck in the outbox;
- lifecycle events never auto-create a thread;
- unread summary: counts, decreases after read, other tenant 0.

**`apps/api/src/chat/logistics/chat-logistics.mapping.spec.ts` (4)** — mapping per event, no PII/COD/ids copied, failure reason allow-list, malformed tracking code dropped, non-logistics events ignored.

**`apps/api/src/chat/policies/chat-eligibility.policy.spec.ts`** — normalization test replaced by exact-match recipient identity (positive + `+88`/`88` negative).

**`apps/web-merchant/tests/unit/chat/chat-logistics-ui.test.tsx` (14)** — system message text (all keys, reason translation, unsafe reason ignored, unknown key/missing code fallbacks); parcel titles; role → section and parcel routes; error keys; context bar; list item title; `OpenConversationButton` (single request on double click, none on render, role route navigation, neutral unavailable toast, admin reason dialog with validation and retry carrying the reason, merchant desk without client merchant id); unread badge (count, 99+, hidden at 0).

## 3. Changed existing tests (intentional behaviour changes, approved)

- `chat-phase2.e2e-spec.ts`: parcel fixture phone is now the exact customer phone (was `+88…`, relied on the removed normalization); the reassignment test, which flips `current_rider_id` by raw SQL, now re-opens the thread as rider1 after restoring, because get-or-create reconciliation marks rider1 `REMOVED` meanwhile.
- `tests/unit/chat/chat-fixtures.ts` (web): summary fixture gained `parcel: null`.

## 4. Not executed / environment notes

- **Playwright E2E**: same blocker as Phase 4 — the existing harness targets the seeded development stack without migrations 0010/0011 (must not be applied). The API integration suite above covers the server workflows end to end; the UI flows are covered by component tests only.
- **`notifications-webhooks.e2e-spec.ts`**: logs in as the seeded demo merchant on the development database and uses `TestingModule` (cannot resolve `Reflector` in this install — Phase 2 note). Not run. Partial evidence: the logistics suite drives real `parcel.*` events through all their notification/webhook targets and asserts nothing remains unpublished.
- **Test-only schema shim**: migrations do not create `parcels.delivery_otp_code` (pre-existing drift, not repaired). The logistics suite adds that column to the throwaway database only so real `Parcel` entity loads work. Probe confirmed it is the only missing column for parcels, riders, assignments, status history, merchants and users.
- Vitest must run from an uppercase `C:\` working directory (Git Bash `/c/…` loads React twice).
