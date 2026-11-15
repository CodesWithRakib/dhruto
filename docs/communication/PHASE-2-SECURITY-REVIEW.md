# Communication Platform — Phase 2 Security Review

Scope: the chat REST backend, the S-1 legacy WebSocket fix, and the outbox integration. Every control below is backed by an automated test, referenced as **[U]** for unit tests (`src/chat/**/*.spec.ts`), **[I]** for integration tests (`test/chat-phase2.e2e-spec.ts`), **[S]** for schema tests (`test/chat-foundation.e2e-spec.ts`) and **[C]** for contract tests.

## 1. S-1 — legacy chat room access (Critical) → **Resolved**

**Finding (Phase 1).** `NotificationsGateway` exposed `chat:join`, `chat:leave`, `chat:message` and `chat:typing`. Any authenticated client could join any `chat:<roomId>` room and broadcast unpersisted messages to its occupants.

**Pathway inventory.** The gateway had exactly those four `@SubscribeMessage` handlers. Every other `client.join` call is server-side in `handleConnection`, derived from the verified JWT (`user:`, `role:`, `merchant:`, `hub:`, `rider:` rooms). No other gateway or code path joins sockets to rooms. The web app's `use-notification-socket.ts` defines helpers that emit `chat:*` events, but no component calls them.

**Fix (`apps/api/src/notifications/gateways/notifications.gateway.ts`).**

1. All four handlers and their imports were removed. The gateway now has **no** client-to-server events and no code path that joins a `chat:*` room.
2. A per-socket middleware is installed **before any `await`** in `handleConnection`. It drops every client event in the reserved `chat:` namespace, logs `LEGACY_CHAT_EVENT_REJECTED`, and replies with an `exception` event.
3. **A DoS issue was found and avoided during the fix.** socket.io re-emits a middleware `next(err)` as a server-side `error` event, which throws when no listener is attached. Rejecting through `next(err)` would have let any client crash the process with one `chat:join`. The guard therefore never calls `next(err)`.

**Regression tests [I]:** gateway has no legacy handler methods · unauthenticated socket is disconnected · authenticated non-member sending all four events gets 4 `exception`s, **no socket ends up in any `chat:*` room**, and nothing is broadcast · 50-event flood leaves the API healthy · `emitToUser` notification delivery still works.

**Residual:** the unused web-app helpers still emit `chat:*`; the server now rejects them. Remove them when the Phase 6 UI replaces that hook.

## 2. Authorization model

All conversation access goes through `ChatAuthorizationService`. The pure decision functions live in `policies/chat-eligibility.policy.ts`.

**Access = ACTIVE membership row AND live eligibility**, or a scoped staff permission with a reason and an audit record.

- **Facts come from the database on every request**, never from the body or JWT claims (role, `status = ACTIVE`, merchant ownership, rider profile, active `HubUserAssignment`s, the parcel's current rider and hub, recipient phone). Stale tokens therefore cannot carry stale privileges. Suspended accounts are denied.
- **Eligibility is re-evaluated live**, so membership alone never suffices. A rider reassigned away from a parcel, or a hub manager unassigned from a hub, loses access immediately even though their participant row still says ACTIVE [U][I].
- **Never trusted from clients:** `senderId`, `sequence`, participant role on create, `merchantId` for merchants, membership state, permissions. Strict schemas reject these keys outright [C][I].

### Authorization matrix (participant path)

| Conversation type   | ADMIN    | HUB_MANAGER                              | RIDER                              | MERCHANT                    | CUSTOMER                     |
| ------------------- | -------- | ---------------------------------------- | ---------------------------------- | --------------------------- | ---------------------------- |
| PARCEL_DELIVERY     | eligible | assigned to the parcel's **current** hub | parcel's **current** rider         | owns the parcel's merchant  | recipient phone matches      |
| SUPPORT_TICKET      | eligible | creator (or hub/parcel scope)            | creator (or parcel scope)          | ticket's merchant is theirs | creator, or parcel recipient |
| HUB_OPERATIONS      | eligible | assigned to hub                          | rider of the hub                   | ✗                           | ✗                            |
| MERCHANT_DESK       | eligible | ✗                                        | ✗                                  | own merchant                | ✗                            |
| INTERNAL_SUPERVISOR | eligible | membership-gated                         | ✗                                  | ✗                           | ✗                            |
| DIRECT / GROUP      | eligible | membership + shared hub when added       | membership + shared hub when added | ✗                           | ✗                            |

"Eligible" means _may be a participant_. Every row still requires an ACTIVE membership; ADMIN is no exception. Within a conversation, actions follow the participant role: OWNER/MODERATOR may manage members, change status, pin and remove any message; MEMBER may send, react, edit/delete own messages and report; OBSERVER may read and report.

### Staff path (no implicit ADMIN access)

`RolesGuard` lets ADMIN pass every `@Roles` check, so chat routes deliberately do not rely on it.

| Permission                                                           | ADMIN | HUB_MANAGER | Enforced at                                                |
| -------------------------------------------------------------------- | ----- | ----------- | ---------------------------------------------------------- |
| `CONVERSATION_VIEW_ANY` (+`VIEW_RESTRICTED` for INTERNAL_SUPERVISOR) | ✓     | ✗           | `/chat/admin/conversations*`, reason required, audited     |
| `CONVERSATION_INTERVENE`                                             | ✓     | ✗           | `intervene`: visible MODERATOR membership + system message |
| `CONVERSATION_MODERATE`                                              | ✓     | own hubs    | archive/close/reopen (staff path), **lock/unlock always**  |
| `MESSAGE_MODERATE`                                                   | ✓     | own hubs    | `messages/:id/remove`                                      |
| `PARTICIPANT_MANAGE`                                                 | ✓     | ✗           | add/remove on conversations the actor doesn't moderate     |
| `INTERNAL_NOTE_MANAGE`                                               | ✓     | own hubs    | `/chat/admin/conversations/:id/notes`                      |
| `REPORT_REVIEW`, `AUDIT_VIEW`, `CONVERSATION_EXPORT`                 | ✓     | ✗           | admin queues and exports                                   |

"Own hubs" means the conversation's `hub_id`, or the parcel's current hub, is in the manager's active assignments. Hub-less conversations give hub managers no staff scope [U].

**Tests [I]:** ADMIN gets 404 on participant routes · staff view without a reason → 422 · with a reason → 200 plus an audit row carrying the reason and `actor_role` · hub manager denied view-any (404), admin listing (403) and audit · CTG manager cannot lock or remove in DHK (404) · DHK manager can, with reason · lock blocks sends (409) · OWNER/MODERATOR participants cannot unlock.

## 3. Tenant isolation results [I]

- **Merchant:** merchant B cannot create (422), read (404) or send to (404) merchant A's parcel thread, and vice versa. `MERCHANT_DESK` with a spoofed `merchantId` is rejected. Listings never contain another merchant's conversations.
- **Rider:** a rider at another hub cannot open the parcel thread. On reassignment the old rider gets 404 for read and send, and the new rider joins via get-or-create.
- **Hub:** other-hub managers are denied moderation and notes. A rider from another hub cannot be added to a group.
- **Customer:** only the recipient (phone match, tolerant of a `+88` prefix) can open the parcel thread. Merchants and customers cannot open DIRECT/GROUP conversations (403), which prevents cold-messaging arbitrary users by id.

## 4. Internal notes

These live in a separate table behind separate `/chat/admin/*` routes requiring `INTERNAL_NOTE_MANAGE`. **[I]** checks that a note's text never appears in participant detail, history, list or search payloads, and that merchants (403) and other-hub managers (404) cannot read notes.

## 5. Audit trail

The following write `chat_audit_logs` in the **same transaction** as the action:

- conversation create and status change
- participant add and remove (self-leave too)
- moderator removal, pin and unpin
- note create and delete, report resolution
- every staff read: list, view, messages, export, audit-log read, intervention

Staff reasons are stored, and the DB requires a non-empty reason for view and intervention. Rows cannot be updated (trigger, **[S]**).

## 6. Data protection

- Outbox payloads carry **ids, sequences and types only, never message content**. Verified by a marker-string test [I].
- Participant payloads expose `displayName` and `platformRole` only (phone and email are never returned; tested). `storage_key` is never mapped.
- **Deletion:** visible content and metadata are cleared. The last content is preserved in `chat_message_edits`, a moderator-only table, so a sender cannot destroy evidence for an open report. **Open item:** a retention and purge policy for edit history is needed before go-live (privacy trade-off).
- The client-controlled `X-Request-Id` is sanitized (≤128 safe chars) before it reaches the outbox or audit log. Otherwise an oversized id could fail sends via the outbox contract [U].

## 7. Abuse protection

- **Per-user rate limits** on every route group: send, create, react, report, search, participants, cursor, mutate, read and admin. They use the existing Redis-backed `RateLimitGuard` with a memory fallback.
- **Payload bounds:** 4000-char messages, ≤10 attachments, 50 participants, 50 pins, ≤10 reactions per user per message, search limited to 2–100 chars and 50 results, all pages capped. JSON bodies are capped at 1 MB.
- **Duplicates:** send idempotency, get-or-create, unique reactions, pins and reports.
- **Enumeration:** inaccessible resources return 404, and parcel/merchant scope errors use the same message for "missing" and "not yours".
- **Attachment references** must be the sender's own UPLOADED files in the same conversation, not yet used, and matching the message type. Rows are locked during the check.

## 8. Remaining risks and recommendations

| Risk                                                                 | Severity | Recommendation                                             |
| -------------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| Deleted-content evidence retained indefinitely                       | Medium   | Define a retention window and a purge job (Phase 7 or ops) |
| Stale ACTIVE rows for reassigned riders (access already denied live) | Low      | The Phase 5 parcel workflow should mark them REMOVED       |
| Gateway CORS hardcoded to localhost (Phase 1 S-2)                    | Medium   | Address in Phase 3 with the new gateway                    |
| Admin listing generates an audit row per call                        | Low      | Acceptable. Monitor audit volume                           |
| No SUPERADMIN; ADMIN holds every chat permission                     | Info     | Narrow ADMIN once an approved SUPERADMIN exists            |
