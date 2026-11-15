# Communication Platform — Phase 4 Realtime Integration

How the web client implements `PHASE-3-REALTIME-PROTOCOL.md`.

## 1. Connection lifecycle (`ChatSocketClient`)

- One socket to `${apiOrigin}/chat`, created by `ChatRealtimeProvider` when a session exists; disconnected on logout or when leaving the messenger.
- Token is supplied through the Socket.IO `auth` **callback**, re-read from the store on every (re)connect — never in the URL or query string. Token refreshes do not recreate the socket.
- Transport: `websocket`. Socket.IO reconnection with backoff 1 s → 15 s, jitter 0.5.
- **Auth failures** (`connect_error` with `UNAUTHENTICATED` / `TOKEN_EXPIRED`) and **server disconnects** (`io server disconnect`, e.g. session expiry) are not retried by Socket.IO; the client refreshes through the existing REST session (`getMe` → base query single-flight refresh), then reconnects with its own capped backoff. After 4 consecutive failures, or if refresh fails with no token, state becomes `unauthorized` — no loops.
- State machine surfaced to the UI: `idle → connecting → connected ⇄ reconnecting → disconnected | unauthorized` (`ConnectionBanner`).
- `request()` returns `null` when disconnected, on ack timeout (8 s) or on malformed acks; callers fall back to REST.

## 2. Rooms

`useConversationRoom` joins the open conversation when connected and re-joins on every new connection epoch. Cleanup leaves the room and clears its typing state. A `NOT_FOUND` ack (removed / no access) invalidates the detail query so the panel shows the unavailable state.

## 3. Recovery (protocol §10)

1. On (re)connect the epoch increments → room re-join.
2. The join ack returns `lastMessageSequence`, cursors and presence → seeds presence and my cursor.
3. `syncToHead(conversationId, head)`:
   - timeline not loaded → load latest page;
   - local `lastSeenSequence` ≥ head → nothing;
   - otherwise `afterSequence` pages of 100, up to 5 pages;
   - still behind → reset the timeline and load the latest page (no unbounded replay).
4. The inbox is invalidated on reconnect (durable events are not replayed by the server).
5. **Live gap detection**: a `message:new` whose sequence is beyond `lastSeen + 1` triggers the same `syncToHead`.

## 4. Event → state mapping (`useChatEventHandlers`)

| Event                                                               | Effect                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `message:new` / `message:updated`                                   | `messageReceived` (key merge) + inbox entry update / move to top + unread recompute; gap check.    |
| `message:deleted`                                                   | Terminal delete (content cleared), `eventId`-deduped.                                              |
| `reaction:updated`                                                  | Delta applied once per `eventId`; my own echo is skipped when my REST response already applied it. |
| `pin:updated`                                                       | Invalidate pins.                                                                                   |
| `cursor:updated`                                                    | Monotonic cursor update (delivered ≥ read); if mine, update inbox unread (multi-device).           |
| `conversation:updated`                                              | Status patched into detail + inbox caches (composer becomes read-only immediately).                |
| `conversation:created`, `membership:revoked`, `participant:updated` | Invalidate inbox / detail.                                                                         |
| `typing`                                                            | Ignored for self; stored with `expiresAt`; pruned every second.                                    |
| `presence`                                                          | Stored per user.                                                                                   |

All listeners are registered once per socket and removed on cleanup. Handlers are idempotent because delivery is at-least-once.

## 5. Sending and receipts

- Messages are sent over REST only (ADR-025). The socket only receives.
- Read cursor: sent when the newest message is actually visible (at bottom, tab visible, window focused), debounced, never backwards; socket `cursor:read` first, REST `POST …/read` fallback.
- Delivered cursor: sent for the newest received sequence while the conversation is open.
- Typing: `typing:start` at most every max(server throttle + 500 ms, 3 s); `typing:stop` after 4 s idle, on send and on unmount.

## 6. Security properties (client side)

No token in URLs or logs; no client-supplied identity; no frontend-only permissions (UI hides controls, API enforces); content rendered as text; no legacy `chat:*` events emitted on the default namespace; presence only from conversations the server let us join.
