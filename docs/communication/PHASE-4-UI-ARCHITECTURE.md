# Communication Platform — Phase 4 UI Architecture

## 1. Component tree

```
messages/layout.tsx  (server)          — per role, sets section + noindex metadata
└─ MessengerLayout  (client)           — Suspense boundary
   └─ Messenger                        — reads :conversationId (UUID-validated), session gate
      └─ ChatRealtimeProvider          — ONE /chat socket + event handlers
         ├─ ConnectionBanner           — reconnecting / disconnected / unauthorized
         ├─ ConversationSidebar        — search box, InboxList | MessageSearchResults
         │  └─ ConversationListItem*
         └─ ConversationPanel key=id   — detail, pins, room join, receipts, actions
            ├─ header (back link, title, PresenceSubtitle, info toggle)
            ├─ MessageTimeline key=id  — role="log", anchoring, load-older
            │  └─ MessageBubble*       — memo; computes its own permissions
            ├─ TypingIndicator
            ├─ MessageComposer
            ├─ ConversationInfoPanel   — inline ≥ xl, Sheet otherwise
            └─ Edit / Remove / Report dialogs, delete ConfirmDialog
messages/page.tsx, [conversationId]/page.tsx → return null (URL only)
```

Why the layout: in the App Router a layout persists while child segments change, so switching conversations keeps the socket, listeners, inbox cache and scroll state of the list. `DashboardShell` keyed `<main>` by full pathname (remounting everything); it now collapses all `/…/messages/*` paths to one key.

## 2. Responsive behaviour

| Width   | Layout                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------- |
| < md    | List **or** conversation; header back link returns to the list (URL-driven, so browser back works). |
| md – xl | List (w-80/96) + conversation; info panel as a right drawer (`Sheet`).                              |
| ≥ xl    | List + conversation + inline info panel.                                                            |

Height is `100dvh` minus shell chrome so the composer stays visible with mobile browser bars.

## 3. State ownership

| Data                                           | Owner                 | Reason                                                                                                                                                                                             |
| ---------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inbox pages, conversation detail, pins, search | RTK Query (`chatApi`) | Server cache with tags; realtime patches the single `INBOX_ARGS` cache via `updateQueryData`.                                                                                                      |
| Message timeline per conversation              | `chatTimeline` slice  | Merges three sources (REST pages, socket events, optimistic sends) with sequence ordering, dedupe and terminal-delete rules that an endpoint cache cannot express. LRU-bounded to 8 conversations. |
| Connection, typing, presence                   | `chatEphemeral` slice | High churn; isolated so only small subscribers re-render. Cleared whenever not connected.                                                                                                          |
| Draft, reply target, dialogs, info open        | Component state       | Local UI only.                                                                                                                                                                                     |

No new state library and no second API client — everything uses the existing Redux store and `baseApi` (with its single-flight token refresh).

## 4. Timeline model

- **Key** = `clientMessageId ?? id`. The optimistic bubble and the canonical message share the key, so whichever of REST response / `message:new` arrives first replaces it in place.
- **Order** = BIGINT `sequence` (`BigInt` compare); pending messages sort last.
- **Merge** = deletion is terminal; an older edit snapshot never overwrites newer content; failure never downgrades a sent message.
- **Windows**: `oldestSequence` / `hasMoreOlder` for history; `lastSeenSequence` = last contiguous sequence (gap-aware) for recovery.
- **Dedupe**: delta events (`reaction`, `delete`, `cursor`) are applied once per `eventId` (bounded set of 500).

## 5. Permission-aware UI

`conversationCaps(status, myParticipation.capabilities)` + `messagePermissions(message, mine, caps)` decide which controls render. They mirror backend rules for UX only; **every action is still authorized by the API**, and a rejected action surfaces the mapped error. Pending, failed, deleted and system messages expose no actions. Read-only conversations show the reason in place of the composer.

## 6. Performance

- `MessageBubble` is memoized; parents pass stable `caps`, handler objects and a `replyTarget` reference instead of per-row derived objects.
- Off-screen rows use `content-visibility: auto` with an intrinsic size — browser-native windowing without a virtualization dependency or broken scroll anchoring.
- History pages are 50 messages; the timeline cache is LRU-bounded; typing churn re-renders only `TypingIndicator`.
- Conversation search is server-side; inbox search is debounced.

## 7. Accessibility and i18n

Landmarks (`aside`, `section`, `nav`), `role="log"` with polite live updates for the timeline, labelled icon buttons, `aria-current` for the active conversation, `aria-pressed` for reactions, focus-visible rings, keyboard send / cancel, dialogs via Radix (focus trap, Esc). All strings come from the `Chat` namespace (en, bn); dates use `Intl` with the active locale; spacing uses logical properties (`ms/me`, `start/end`) for RTL readiness. Message content is rendered as text (no HTML), so user content cannot inject markup.
