# Communication Platform — Phase 4 Implementation

Date: 2026-11-15 · Scope: production-grade web messenger in `apps/web-merchant`, built on the Phase 2 REST API and Phase 3 `/chat` realtime protocol. No backend, schema or contract changes.

## 1. What was built

| Area              | Result                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes            | `/{merchant,admin,hub,rider,customer}/messages` and `/…/messages/[conversationId]` (10 routes, deep-linkable, `noindex`). Messenger lives in `messages/layout.tsx` so it persists across conversation switches.           |
| Conversation list | Infinite (cursor) inbox, server search (≥2 chars, 350 ms debounce), unread badges (99+), last-message preview (`You:` / deleted), read-only lock, active state (`aria-current`), skeleton / empty / error / retry.        |
| Timeline          | Newest page first, scroll-up history (`beforeSequence`), scroll anchoring on prepend, date separators, sender grouping (5 min), jump-to-latest, deep link to a message (`?m=&seq=`), deleted / edited / system rendering. |
| Composer          | Enter sends, Shift+Enter newline (IME-safe), Esc cancels reply, autosize, length counter, read-only reason. No attachment controls (Phase 6).                                                                             |
| Sending           | Optimistic bubble keyed by `clientMessageId`; REST is authoritative; failed → retry with the **same** `clientMessageId` or discard.                                                                                       |
| Realtime          | One `/chat` socket per messenger mount; room join per open conversation; reconnect + `afterSequence` recovery; live gap detection; `eventId` dedupe.                                                                      |
| Receipts          | Delivered (debounced 1 s) and read (600 ms, only when at bottom + tab visible + window focused); monotonic; socket first, REST fallback. Sent / delivered / read ticks from other participants' cursors.                  |
| Typing / presence | Throttled emitter (start ≤ every 3 s, idle stop 4 s); TTL-pruned indicator; presence only for joined conversations; cleared on disconnect.                                                                                |
| Actions           | Reply, edit, delete own, moderator remove (reason), reactions (quick set, toggle), pin/unpin, report (reason + details) — each shown only when backend capabilities allow it.                                             |
| Info panel        | Type, status, participants (platform + conversation role, presence, last seen), pinned messages with jump. Inline at `xl`, drawer below.                                                                                  |
| Legacy cleanup    | `use-notification-socket.ts` no longer exposes `chat:*` helpers (S-1 pathway gone from the client).                                                                                                                       |
| i18n / a11y       | `Chat` namespace (en + bn), `Nav.messages`; semantic landmarks, `role="log"`, labelled controls, `aria-pressed` reactions, keyboard flows, logical (RTL-safe) spacing classes.                                            |

## 2. Files

**Feature module `features/chat/`**

- `api/chat.api.ts` — RTK Query endpoints injected into the existing `baseApi` (no second client).
- `lib/` — `timeline.ts` (merge rules, ordering, grouping, delivery state), `permissions.ts`, `errors.ts`, `display.ts`, `routes.ts`.
- `state/` — `chat-timeline.slice.ts`, `chat-ephemeral.slice.ts`, `chat-thunks.ts`.
- `realtime/` — `chat-socket-client.ts`, `chat-realtime-provider.tsx`, `use-chat-event-handlers.ts`, `use-conversation-room.ts`.
- `hooks/` — `use-conversation-timeline`, `use-send-message`, `use-read-receipts`, `use-typing-emitter`, `use-message-actions`.
- `components/` — `messenger`, `conversation-sidebar`, `conversation-panel`, `message-timeline`, `message-bubble`, `message-composer`, `message-dialogs`, `message-search-results`, `conversation-info-panel`, `chat-primitives`.

**Shared changes**

- `store/index.ts` — registers `chatTimeline`, `chatEphemeral`.
- `config/routes.ts`, `config/navigation.ts` — `messages` / `messageThread` for all five roles; nav item per role.
- `components/layout/dashboard-shell.tsx` — `<main>` key collapses `/…/messages/*` to one key so the messenger (and socket) is not remounted per conversation.
- `features/notifications/hooks/use-notification-socket.ts` — chat helpers removed; uses shared `lib/api/socket-origin.ts`.
- `hooks/use-media-query.ts`, `lib/api/socket-origin.ts` — new.
- `messages/en.json`, `messages/bn.json` — additive keys only.
- `tests/setup.ts` — browser stubs guarded by `typeof window` so node-environment tests can load it (no behaviour change for jsdom tests).
- 15 route files under `app/[locale]/(…)/…/messages/`.

## 3. Endpoints used (Phase 2, unchanged)

`GET /chat/conversations` · `GET /chat/conversations/:id` · `GET /chat/conversations/:id/messages` (`beforeSequence` / `afterSequence`, limit 50 / 100) · `POST …/messages` · `PATCH /chat/messages/:id` · `DELETE /chat/messages/:id` · `POST /chat/messages/:id/remove` · `POST|DELETE /chat/messages/:id/reactions[/:reaction]` · `GET|POST /chat/conversations/:id/pins`, `DELETE /chat/conversations/:id/pins/:messageId` · `POST /chat/messages/:id/reports` · `POST …/read`, `POST …/delivered` · `GET /chat/search`.

## 4. Socket events used (Phase 3, unchanged)

Client → server: `conversation:join`, `conversation:leave`, `typing:start`, `typing:stop`, `cursor:read`, `cursor:delivered`, `presence:query`.
Server → client: `session:ready|error|expired`, `message:new|updated|deleted`, `reaction:updated`, `pin:updated`, `cursor:updated`, `conversation:created|updated`, `participant:updated`, `membership:revoked`, `typing`, `presence`. Names come from the `ChatClientEvent` / `ChatServerEvent` contract enums — none invented.

## 5. Out of scope (as specified)

Uploads / attachment sending (existing attachments render as name chips only), parcel lifecycle conversations, admin center, internal notes UI, moderation dashboard, AI features, backend or schema changes.
