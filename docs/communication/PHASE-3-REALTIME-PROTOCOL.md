# Communication Platform — Phase 3 Realtime Protocol

This is the contract Phase 4 (web client) implements. All event names, payloads and limits come from `@dhruto/contracts` (`packages/contracts/src/chat/chat-realtime.schema.ts`). Do not hard-code strings in clients; import `ChatClientEvent`, `ChatServerEvent`, `ChatSocketErrorCode` and the payload types.

## 1. Transport and namespace

| Item                 | Value                                                               |
| -------------------- | ------------------------------------------------------------------- |
| Library              | Socket.IO 4 (server `socket.io@4.8`, client `socket.io-client@4.8`) |
| Namespace            | `/chat` (`CHAT_SOCKET_NAMESPACE`), same host/port as the REST API   |
| Transports           | `websocket` recommended; polling also works                         |
| Inbound packet limit | 64 KiB; larger packets close the connection                         |
| Heartbeat            | Socket.IO ping every 10 s, 5 s timeout                              |

The legacy default namespace `/` (NotificationsGateway) still serves notifications and **rejects every `chat:`-prefixed event** (S-1). Chat traffic must use `/chat`, and its events deliberately never start with `chat:`.

## 2. Connection authentication

```ts
import { io } from "socket.io-client";
import { CHAT_SOCKET_NAMESPACE, ChatServerEvent } from "@dhruto/contracts";

const socket = io(`${API_ORIGIN}${CHAT_SOCKET_NAMESPACE}`, {
  transports: ["websocket"],
  auth: { token: accessToken }, // or header  Authorization: Bearer <token>
});
socket.on(ChatServerEvent.SESSION_READY, (ready) => {
  /* ChatSessionReady */
});
socket.on("connect_error", (err) => {
  /* err.data: ChatSocketError */
});
```

The server:

1. checks the `Origin` header against the trusted list (S-2);
2. verifies the **access** token (HS256 signature, `type: "access"`, a mandatory `exp` that has not passed);
3. applies the per-user handshake budget;
4. loads the user from PostgreSQL. Inactive or suspended accounts are rejected, and role and scope come from the database.

Any `userId`, `role` or other identity field the client sends is ignored.

`session:ready` (`ChatSessionReady`):

```json
{
  "userId": "1f0c…",
  "sessionId": "Kd8…",
  "expiresAt": "2026-11-15T12:15:00.000Z",
  "serverTime": "2026-11-15T12:00:01.002Z"
}
```

Rejections arrive as `connect_error` with `err.data`:

```json
{ "code": "TOKEN_EXPIRED", "message": "Access token expired" }
```

Codes: `UNAUTHENTICATED` (missing, invalid or refresh token, inactive account), `TOKEN_EXPIRED`, `RATE_LIMITED`. An untrusted `Origin` is refused at the transport level (connection error, no payload).

**Token expiry:** at `expiresAt` the server emits `session:expired` and disconnects. The client refreshes the token via REST and reconnects with the new one. The server never extends a session.

## 3. Rooms (server-controlled only)

| Room                 | Joined by                                            | Purpose                                           |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `u:<userId>`         | Server, at connection                                | All devices of the user; target of durable events |
| `c:<conversationId>` | Server, after `requireMember` on `conversation:join` | Focused conversation: typing, presence            |

There is no event that takes a room name. Joined `c:` rooms are re-authorized periodically (default 60 s) and on membership removal. A socket can join at most 25 conversations at once (`CHAT_MAX_JOINED_CONVERSATIONS_PER_SOCKET`).

## 4. Client → server events (all acknowledged)

Every event returns `ChatSocketAck<T>`, which is either `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. Use `socket.timeout(ms).emitWithAck(event, payload)`. Payloads are strict: unknown keys fail with `INVALID_PAYLOAD`.

| Event                | Payload                                     | Ack data               | Notes                                                                           |
| -------------------- | ------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `conversation:join`  | `{ conversationId }`                        | `ChatSocketJoinResult` | Membership + live eligibility. `NOT_FOUND` when not allowed (no existence leak) |
| `conversation:leave` | `{ conversationId }`                        | `{ conversationId }`   | Also stops your typing indicator                                                |
| `typing:start`       | `{ conversationId }`                        | `{ expiresInMs }`      | Requires join. Call again every ~3 s while typing                               |
| `typing:stop`        | `{ conversationId }`                        | `{ conversationId }`   |                                                                                 |
| `cursor:read`        | `{ conversationId, lastReadSequence }`      | `ChatCursorState`      | Same rules as `POST …/read`: monotonic, ≤ head                                  |
| `cursor:delivered`   | `{ conversationId, lastDeliveredSequence }` | `ChatCursorState`      | Same rules as `POST …/delivered`                                                |
| `presence:query`     | `{ conversationId }`                        | `ChatPresenceEntry[]`  | Requires join; returns the conversation's eligible participants only            |

Example join:

```ts
const ack = await socket.timeout(5000).emitWithAck("conversation:join", { conversationId });
// { ok: true, data: { conversationId, lastMessageSequence: "128", lastReadSequence: "120",
//   lastDeliveredSequence: "128", presence: [{ userId, status: "online", lastSeenAt: null }, …] } }
// { ok: false, error: { code: "NOT_FOUND", message: "Conversation not found" } }
```

**Sending messages stays on REST** (`POST /chat/conversations/:id/messages` with `clientMessageId`). This keeps idempotency, rate limits and attachment validation in one place. The socket only _receives_ the resulting `message:new`.

## 5. Server → client events

### Durable (from the transactional outbox, delivered to `u:` rooms of currently eligible participants)

Every durable event carries `eventId` (the dedupe key), `conversationId` and `occurredAt`.

| Event                  | Type                           | Extra fields                                                                                    |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `message:new`          | `ChatMessageEvent`             | `sequence`, `message: ChatMessageItem` (loaded from PostgreSQL at fan-out time)                 |
| `message:updated`      | `ChatMessageEvent`             | Edited message                                                                                  |
| `message:deleted`      | `ChatMessageDeletedEvent`      | `messageId`, `sequence`, `moderated`                                                            |
| `reaction:updated`     | `ChatReactionUpdatedEvent`     | `messageId`, `userId`, `reaction`, `action: added\|removed`                                     |
| `pin:updated`          | `ChatPinUpdatedEvent`          | `messageId`, `action: pinned\|unpinned`, `byUserId`                                             |
| `cursor:updated`       | `ChatCursorUpdatedEvent`       | `userId`, `lastReadSequence`, `lastDeliveredSequence` (also sent to the reader's other devices) |
| `conversation:created` | `ChatConversationCreatedEvent` | `type`                                                                                          |
| `conversation:updated` | `ChatConversationUpdatedEvent` | `from`, `status` (archive/close/reopen/lock/unlock)                                             |
| `participant:updated`  | `ChatParticipantUpdatedEvent`  | `userId`, `change: added\|removed`, `role`, `status`                                            |

Example `message:new`:

```json
{
  "eventId": "8c1d2a6e-…", "conversationId": "7c1e…", "occurredAt": "2026-11-15T12:00:03.120Z",
  "sequence": "129",
  "message": { "id": "…", "sequence": "129", "senderId": "…", "type": "TEXT", "content": "Arriving in 5 minutes",
               "attachments": [], "reactions": [], "createdAt": "…", "editedAt": null, "deletedAt": null, … }
}
```

`message.reactions[].reactedByMe` is always `false` in realtime payloads because it is viewer-specific. Derive it from local state or REST.

### Session and membership

| Event                | Payload                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `session:ready`      | `ChatSessionReady`                                                                                                                                     |
| `session:expired`    | `{ expiresAt }`, followed by disconnect                                                                                                                |
| `session:error`      | `ChatSocketError` (for example a flood disconnect)                                                                                                     |
| `membership:revoked` | `ChatMembershipRevokedEvent { conversationId, reason: removed\|left\|ineligible }`. The server has already removed you from the room; drop local state |

### Ephemeral (never persisted, never replayed)

| Event      | Payload                                                             |
| ---------- | ------------------------------------------------------------------- |
| `typing`   | `ChatTypingEvent { conversationId, userId, isTyping, expiresInMs }` |
| `presence` | `ChatPresenceEvent { conversationId, userId, status, lastSeenAt }`  |

## 6. Message event flow

```
REST POST /messages ──► transaction: INSERT message + INSERT event_outbox ──► COMMIT
                                                                              │
outbox relay (any instance, SKIP LOCKED) ──► ChatRealtimeFanoutService ◄──────┘
   │  1. refuse if gateway absent or Redis distribution unhealthy (throw → retry with backoff)
   │  2. recipients = ACTIVE participants ∩ live eligibility (PostgreSQL)
   │  3. load message from PostgreSQL (outbox payload has no content)
   └► nsp.to(u:<id>…).emit("message:new") ──► Redis adapter ──► sockets on every instance
```

**Delivery semantics: at-least-once, best-effort.** It is **not** exactly-once.

- Retries, or a crash between emit and `markPublished`, can deliver an event twice. Dedupe on `eventId`, and for messages also on `message.id` / `sequence`.
- Redis pub/sub is fire-and-forget, so an event can be missed (for example during the ≤5 s before a Redis failure is detected, or while a client is reconnecting).
- PostgreSQL is the source of truth. Use §9 to recover.

## 7. Presence lifecycle

- **Online** when a user has at least one live `/chat` connection on any instance. Connections are tracked in a Redis sorted set with expiry scores, refreshed every 25 s, TTL 70 s.
- **Offline** when the last connection closes, or its entry expires (crashed instance). `lastSeenAt` is kept for 7 days.
- **Multi-device:** closing one device never produces `offline` while another remains connected.
- **Visibility:** presence is only (a) in `conversation:join` acks and `presence:query` for a conversation you have joined, and (b) pushed as `presence` events to sockets that have joined a conversation shared with that user. There is no global or cross-tenant presence lookup.
- Presence events are sent only on online/offline transitions, never per heartbeat.

## 8. Typing lifecycle

- `typing:start` requires a joined conversation. Repeated starts within 2.5 s are not re-broadcast; they only extend the expiry.
- Server auto-stop: 6 s after the last start (`CHAT_TYPING_TTL_MS`) the server broadcasts `isTyping: false`. Clients should also expire indicators locally after `expiresInMs`.
- Explicit `typing:stop`, `conversation:leave`, membership revocation and disconnect each broadcast a single stop.
- Typing events are sent to the conversation room excluding the sender's own socket. They are never stored or replayed.

## 9. Read and delivery synchronization

- Cursors live on `chat_participants` (Phase 2). REST and the socket `cursor:*` events call the same service: monotonic (backwards updates are no-ops returning current state), bounded by the conversation head, authorized on every call.
- Every advance emits `cursor:updated` to all eligible participants, **including the reader's other devices**. Badge and unread state therefore converge across tabs and phones.
- Unread = `lastMessageSequence − lastReadSequence`. The authoritative values are in `conversation:join` acks and `GET /chat/conversations` (REST).

## 10. Reconnect and recovery protocol (Phase 4 must implement)

Per conversation, the client keeps `lastSeenSequence`, the highest contiguous sequence it holds.

1. **Reconnect** with a fresh access token (refresh first if `session:expired` or `TOKEN_EXPIRED`). Use exponential backoff with jitter.
2. **Rejoin** only the conversations currently on screen. Each `conversation:join` re-authorizes; a `NOT_FOUND` ack means access was lost, so drop it.
3. **Compare** `ack.data.lastMessageSequence` with `lastSeenSequence`. If it is greater, gap-fill with `GET /chat/conversations/:id/messages?afterSequence=<lastSeenSequence>&limit=100`, repeating while `hasMore`. If the gap is very large, fetch only the latest page (`beforeSequence` omitted) and mark older history as "load on scroll"; never replay unbounded history.
4. **Live gap detection:** if a `message:new` arrives with `sequence > lastSeenSequence + 1`, gap-fill as in step 3 before rendering.
5. **Dedupe:** ignore a durable event whose `eventId` was already applied. For messages, upsert by `message.id`; sequences are stable.
6. **Cursors:** after catching up, send `cursor:delivered` with the head and `cursor:read` when visible. The server's monotonic rule makes racing devices safe.
7. For the inbox, re-fetch `GET /chat/conversations` after reconnect. Durable events received while offline are not replayed.

## 11. Errors

| Code                                | Meaning                                                            | Client action                                                  |
| ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `UNAUTHENTICATED` / `TOKEN_EXPIRED` | Handshake rejected                                                 | Refresh token, reconnect                                       |
| `INVALID_PAYLOAD`                   | Schema failure or unknown keys                                     | Fix the client                                                 |
| `NOT_FOUND`                         | Not a member, ineligible, or nonexistent                           | Drop the conversation locally                                  |
| `FORBIDDEN`                         | Visible but action not allowed (for example a locked conversation) | Show a read-only state                                         |
| `NOT_JOINED`                        | Typing or presence without `conversation:join`                     | Join first                                                     |
| `INVALID_SEQUENCE`                  | Cursor beyond head                                                 | Re-sync head via join or REST                                  |
| `RATE_LIMITED`                      | Per-socket budget exceeded (10/s, burst 30; joins 60/min)          | Back off. Repeated abuse leads to `session:error` + disconnect |
| `LIMIT_EXCEEDED`                    | More than 25 joined conversations                                  | Leave unfocused conversations                                  |
| `INTERNAL`                          | Unexpected server error (no details by design)                     | Retry with backoff                                             |
