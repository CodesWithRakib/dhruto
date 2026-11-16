# Communication Platform — Phase 7 Escalation Policy

## 1. Model

Escalation is an **operational overlay** on a conversation, independent of the lifecycle status (`ACTIVE`/`ARCHIVED`/`CLOSED`/`LOCKED`). It never changes lifecycle status, membership, messages or any parcel. Participants never see it (no outbox event, not in participant contracts).

- Current state: `chat_conversations.escalation_status` (nullable enum `OPEN | IN_REVIEW | ESCALATED | RESOLVED | CLOSED`), `escalation_note`, `escalation_assignee_user_id`, `escalation_updated_at`, `escalation_updated_by_user_id`.
- History: append-only `chat_audit_logs` rows (`ESCALATION_CHANGED`, `reason` = note, metadata `{from, to, assigneeUserId, previousAssigneeUserId}`), written in the same transaction under a `FOR UPDATE` row lock.
- Why not reuse `ChatReportStatus`: reports are per message and per reporter; escalation is per conversation and staff-driven. No existing enum fit, so one new enum was added.

## 2. Transitions (`CHAT_ESCALATION_TRANSITIONS`, contracts)

| From \ To | OPEN | IN_REVIEW | ESCALATED | RESOLVED | CLOSED |
| --------- | ---- | --------- | --------- | -------- | ------ |
| (none)    | ✓    |           | ✓         |          |        |
| OPEN      |      | ✓         | ✓         | ✓        | ✓      |
| IN_REVIEW | ✓    |           | ✓         | ✓        |        |
| ESCALATED |      | ✓         |           | ✓        |        |
| RESOLVED  | ✓    |           | ✓         |          | ✓      |
| CLOSED    | ✓    |           | ✓         |          |        |

- `OPEN` = flagged, nobody working; `IN_REVIEW` = a staff member works it (usually assigned); `ESCALATED` = raised to senior staff; `RESOLVED` = handled, may be reopened; `CLOSED` = cycle finished (re-flagging starts a new cycle).
- An ESCALATED case must be resolved before it can be closed.

## 3. Rules

| Rule                  | Enforcement                                                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who                   | ADMIN with `chat.escalation.manage` (+ `view_restricted` for internal supervisor threads). Hub managers and participants cannot read or change escalations (404 / 403).                                                                |
| Reason                | Note (10–1000 chars) required for every change except `IN_REVIEW` (`escalationNoteRequired`). 422 otherwise.                                                                                                                           |
| Assignment            | `assigneeUserId`: an ACTIVE ADMIN holding `escalation.manage`; `null` unassigns; omitted keeps. Reassignment without a status change is allowed on an existing escalation.                                                             |
| Invalid transition    | 409 `CHAT_ESCALATION_INVALID`.                                                                                                                                                                                                         |
| Idempotency           | Same status + same assignee + same/omitted note → 200 with current state, **no** new audit row.                                                                                                                                        |
| Concurrency           | Row lock; the second of two concurrent changes sees the first's result (idempotent or 409).                                                                                                                                            |
| Notification          | One in-app notification (existing `NotificationsService`, type `SYSTEM`) to a newly assigned staff member other than the actor. Best-effort after commit; contains no conversation content. No per-message or broadcast notifications. |
| Lifecycle interaction | None. Closing an escalation does not close the conversation, and closing/archiving a conversation does not change its escalation. No business rule for automatic coupling was approved, so none was implemented.                       |
| Retention interaction | An active escalation (`OPEN`/`IN_REVIEW`/`ESCALATED`) is an **evidence hold**: retention never purges the conversation's attachment objects.                                                                                           |

## 4. Queue

The escalation queue is the operational inbox filtered with `escalation=ACTIVE` (or a concrete state), served by the partial index `IDX_chat_conversations_escalation`. `assignedToMe=true` uses `IDX_chat_conversations_escalation_assignee`.
