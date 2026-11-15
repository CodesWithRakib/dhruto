# Communication Platform — Phase 3 Security Review

Scope: the `/chat` realtime gateway, outbox fan-out, Redis presence and typing, S-2, and S-1 compatibility. **[R]** marks an integration test in `test/chat-realtime.e2e-spec.ts` (two app instances, disposable PostgreSQL and Redis). **[U]** marks a unit test in `src/chat/realtime/realtime-units.spec.ts`. **[P2]** marks the Phase 2 suite, and **[C]** a contract test (`packages/contracts`).

## 1. Socket authentication

| Control                                        | Implementation                                                                                                                               | Test                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Token required at handshake                    | `ChatSocketAuthenticator` (namespace middleware)                                                                                             | [R] missing → `UNAUTHENTICATED`                          |
| Existing JWT service, not a second auth system | `CustomJwtService.verifyAccessToken` (HS256, signature, `type: "access"`)                                                                    | [R] tampered → rejected; refresh token → rejected        |
| Expiry enforced                                | `exp` **mandatory** for sockets (stricter than REST, which accepts tokens without `exp`); session disconnected at expiry (`session:expired`) | [R] expired → `TOKEN_EXPIRED`                            |
| Identity from server-side record               | Subject → PostgreSQL reload; inactive/suspended rejected; role and scope from DB                                                             | [R] suspended → rejected                                 |
| No client identity spoofing                    | `handshake.auth.userId`, `role` etc. ignored                                                                                                 | [R] spoofed `userId`/`role` connects as the token's user |
| Issuer/audience                                | Not configured anywhere in this API, so not checked (documented gap, §7)                                                                     | —                                                        |
| Secrets in logs                                | Tokens never logged; rejections log socket id + code only                                                                                    | Code review                                              |
| Rejection without crash                        | Namespace middleware `next(err)` → client `connect_error` (no server-side `error` event)                                                     | [R] 20 bad handshakes, server healthy                    |

## 2. Room authorization

- **Server-controlled rooms only.** No event accepts a room name. `u:` is joined from the authenticated identity, and `c:` only after `ChatAuthorizationService.requireMember` (ACTIVE membership plus live eligibility).
- **Re-checked on every join.** A syntactically valid id isn't enough: unknown ids and `u:…` strings are rejected; unknown keys get `INVALID_PAYLOAD`.
- **No ADMIN bypass.** Admins can join only after an audited intervention makes them a participant.
- **Revocation:**
  - _removal or leave:_ the fan-out evicts the user's sockets from the room on every instance and sends `membership:revoked`;
  - _eligibility loss without a chat event_ (rider reassignment, hub unassignment): batched revalidation every 60 s evicts them;
  - _durable content:_ re-filtered per event, so it never reaches ineligible users even before revalidation runs.

**Tests [R]:**

- member join succeeds;
- non-member merchant, other-hub manager, unassigned rider, other customer and admin-without-intervention all get `NOT_FOUND`;
- arbitrary UUIDs and `u:victim` are rejected;
- a removed participant gets `membership:revoked`, can't rejoin and can't type;
- a reassigned rider is revoked as `ineligible`, receives no further messages and can't rejoin;
- admin joins after intervention.

## 3. Event scoping and data protection

- Durable events go only to `u:` rooms of **currently eligible** participants. **[R]** checks that other merchants, outsiders and unjoined users receive no `message:*`, `reaction`, `pin`, `typing` or `presence` events.
- Outbox payloads remain content-free. Message content is loaded from PostgreSQL at fan-out time and sent only to eligible recipients. Deleted messages arrive with `content: null`.
- **Presence privacy:** only participants of a shared conversation they've joined can see a user's presence. There is no global lookup. `presence:query` requires a joined conversation **[R]**.
- **Typing** is visible only to sockets joined to that conversation **[R]**.
- `reactedByMe` is never computed for broadcasts, so no viewer-specific data leaks.

## 4. S-1 compatibility

- The legacy `/` guard is unchanged and still drops `chat:*` packets without `next(err)`. **[P2]** tests pass unchanged: no room join, no broadcast, a 50-event flood stays healthy, and notifications still work.
- `/chat` events never use the `chat:` prefix (**[C]** contract test), so the legacy guard can't block them, and they can't be confused with the legacy events.
- The per-packet path in the new gateway never calls `next(err)`. Violations are returned as acks.

## 5. S-2 — CORS and Origin → **Resolved**

- Both gateways spread `SOCKET_SERVER_OPTIONS`, so the shared server's options are deterministic.
- Trusted origins come from `WS_CORS_ORIGINS` (or `CORS_ORIGIN`). `*` is never honoured. Production with no list fails closed for browser origins; development defaults to the local web app.
- `allowRequest` enforces the allowlist on **every handshake, including WebSocket upgrades**, which CORS doesn't cover. Requests without `Origin` (native apps, servers) are allowed, but still need a valid token.
- REST CORS is unchanged.

**Tests:**

- [U] allowlist parsing, wildcard rejection, production fail-closed, exact-match (`app.dhruto.com.evil.example` rejected);
- [R] `Origin: https://evil.example` refused, `http://localhost:5000` accepted.

The `Server`/`Namespace` typing issue is fixed: `NotificationsGateway.server` is now typed `Namespace`.

## 6. Abuse protection

- **Per socket:** a token bucket (default 10 events/s, burst 30) and a separate join budget (60/min). After 20 rate-limit strikes the socket gets `session:error` and is disconnected; the disconnect is deferred so pending acks flush. **[R]** flood test: rate-limited acks, then disconnect, and the REST API stays responsive.
- **Per user:** a handshake budget (default 30/min) on the shared Redis counter, with an in-memory fallback.
- **Packets:** 64 KiB inbound cap (`maxHttpBufferSize`). An oversized packet closes the connection **[R]**.
- **Typing flood:** start broadcasts are throttled (one per 2.5 s per socket per conversation) and need no DB or Redis work.
- **Room-join flood:** join budget, ≤25 joined rooms per socket, and an authorization query per join.
- **Isolation:** one user's flood consumes only that socket's budget. Handlers are async and never hold DB locks.

## 7. Remaining risks

| Risk                                                                                | Severity           | Note / recommendation                                                                                                                                                            |
| ----------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No issuer/audience claims in the platform JWT                                       | Medium             | Platform-wide auth change (needs approval). Sockets add a mandatory `exp`                                                                                                        |
| Revocation window for eligibility changes without a chat event (rider reassignment) | Low                | Durable content is filtered per event; only typing/presence may leak for up to `CHAT_ROOM_REVALIDATE_MS` (60 s). Phase 5 parcel workflow events can trigger immediate revocation |
| Redis pub/sub loss window (≤ probe interval)                                        | Low                | At-least-once is best-effort; clients gap-fill via REST                                                                                                                          |
| Redis runs without auth/TLS in local compose                                        | Medium (prod only) | Use `rediss://` with credentials in production (`PHASE-3-OPERATIONS.md`)                                                                                                         |
| Unused web-app `chat:*` helpers                                                     | Info               | Rejected server-side; remove in Phase 4                                                                                                                                          |
| No load test                                                                        | Info               | Capacity is unverified (operations doc §7)                                                                                                                                       |
