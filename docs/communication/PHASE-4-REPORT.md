# Communication Platform — Phase 4 Report

Date: 2026-11-15 · Scope: production-grade web messenger UI (`apps/web-merchant`) on the Phase 2 REST API and Phase 3 realtime protocol.

**Status: COMPLETE WITH DOCUMENTED LIMITATIONS** — all required features are implemented and verified by typecheck, lint, production build, 60 new unit/component/state/realtime tests and a Phase 1–3 backend regression run; browser E2E was not executed (§6).

## 1. Implemented features

Deep-linked messenger routes for all five roles; persistent messenger layout (one socket across conversation switches); responsive list / conversation / info panel; infinite inbox with server search, unread badges and read-only markers; message timeline with history paging, scroll anchoring, grouping, date separators, jump-to-latest and jump-to-message; composer with optimistic sending, failure state, idempotent retry (same `clientMessageId`) and discard; centralized socket client with auth-aware reconnect; room join, reconnect recovery via `afterSequence`, live gap detection and `eventId` dedupe; delivered/read cursors with sent/delivered/read ticks; typing and presence; reply, edit, delete own, moderator remove, reactions, pin/unpin, report; server message search; info panel (participants, roles, presence, pins); legacy `chat:*` helpers removed from `use-notification-socket.ts`; en/bn i18n; accessibility. Details: `PHASE-4-IMPLEMENTATION.md`.

## 2. Routes and components

Routes: `/{merchant|admin|hub|rider|customer}/messages` and `/…/messages/[conversationId]` (layout + two null pages per role, `noindex`). Navigation item "Messages" for every role.

Components: `Messenger`, `ConversationSidebar`, `ConversationListItem`, `MessageSearchResults`, `ConversationPanel`, `MessageTimeline`, `MessageBubble`, `MessageComposer`, `ConversationInfoPanel`, `EditMessageDialog`, `RemoveMessageDialog`, `ReportMessageDialog`, `ChatAvatar`, `PresenceDot`, `DeliveryStatus`, `TypingIndicator`, `ConnectionBanner`. Tree and responsibilities: `PHASE-4-UI-ARCHITECTURE.md`.

## 3. Endpoints and events

All Phase 2 chat endpoints needed by the UI (list, detail, messages, send, edit, delete, remove, reactions, pins, report, read, delivered, search) via RTK Query injected into the existing `baseApi`. All Phase 3 client and server events from the contract enums; none invented. Lists: `PHASE-4-IMPLEMENTATION.md` §3–4.

## 4. State architecture

RTK Query for server caches (inbox, detail, pins, search) with realtime cache patches; a `chatTimeline` slice merging REST pages, socket events and optimistic sends (sequence ordering, key-based dedupe, terminal deletes, LRU of 8 conversations); a `chatEphemeral` slice for connection, typing and presence. No new state library or API client. Recovery and event mapping: `PHASE-4-REALTIME-INTEGRATION.md`.

## 5. Security behaviour

- Access token only in the socket `auth` callback, re-read per connect; never in URLs or logs.
- Socket auth failures refresh through the existing session layer with a bounded retry budget, then stop (`unauthorized`).
- UI permissions mirror backend capabilities for UX only; the API authorizes every action, and rejections show mapped, localized errors (never raw server messages).
- Message content is rendered as text (XSS-safe; covered by a test).
- Conversation ids from the URL are UUID-validated; 403/404/400 show a neutral unavailable state.
- Presence only from conversations the server allowed us to join; typing/presence cleared when disconnected.
- No legacy `chat:*` traffic on the default namespace (S-1 client pathway removed; regression-tested).
- No upload or attachment controls.

## 6. Test results

| Check                                         | Result                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web typecheck                                 | Pass                                                                                                                                                                |
| Web lint                                      | Pass — 0 errors; 67 pre-existing warnings, none in Phase 4 files                                                                                                    |
| Web production build                          | Pass                                                                                                                                                                |
| Web unit/component tests                      | Pass — 216 / 216 (60 new)                                                                                                                                           |
| Contracts tests                               | Pass — 58 / 58                                                                                                                                                      |
| API chat suites (disposable Postgres + Redis) | Pass — 91 passed, 1 conditional skip                                                                                                                                |
| Playwright E2E                                | **Not executed** — dev DB lacks migrations 0010/0011 (must not be applied); a disposable full stack also needs conversations created by out-of-scope backend flows. |

Full breakdown: `PHASE-4-TEST-REPORT.md`.

## 7. Known limitations

1. **No browser E2E** or manual screen-reader/cross-browser QA yet.
2. **DIRECT conversation names in the list** show the type label: the inbox summary has no counterpart name (the detail view shows it). Needs a backend summary field.
3. **No presence in the sidebar** — presence is only visible for joined (open) conversations, per backend rule.
4. **Realtime only while the messenger is mounted** — outside `/messages` there is no live chat unread badge or toast.
5. **Failed sends are in memory** — a page reload drops unsent (failed) messages; they were never stored server-side.
6. **Group read ticks** show "read" once any other participant has read the message (no per-reader breakdown).
7. **Jump to an old message** loads at most 10 older pages (~500 messages), then shows "message too old".
8. **Attachments** render as name chips only; no preview or download (upload service is Phase 6).
9. Timeline cache is bounded to 8 conversations; re-opening an evicted one refetches.

## 8. Phase 1–3 integrity

No changes under `apps/api` or `packages/` (verified with `git status` / `git diff`). Migrations 0010/0011 were not applied to any shared or development database. Phase 1–3 chat suites pass against fresh disposable containers. `delivery_otp_code` drift was not touched. No commits, no `git add`.

## 9. Can Phase 5 begin?

**Yes**, with these carry-overs: run the Playwright scenarios in `PHASE-4-TEST-REPORT.md` §3 once an isolated stack with chat migrations exists; consider adding counterpart display names to the conversation summary; decide whether a global (outside-messenger) unread indicator is needed.
