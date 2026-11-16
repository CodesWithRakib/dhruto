# Communication Platform — Phase 7 Moderation Policy

## 1. Reports

| Step         | Who                                           | Rule                                                                                                                      | Audit                                  |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Report       | Participant with `REPORT_MESSAGE` (unchanged) | One report per (message, reporter); rate-limited                                                                          | — (unchanged)                          |
| Queue        | ADMIN + `report.review`                       | Filter by status and (new) conversation; metadata only — message content is read in the workspace (reason-gated, audited) | —                                      |
| Start review | ADMIN + `report.review`                       | `OPEN → UNDER_REVIEW`; repeating it is a no-op                                                                            | **`REPORT_REVIEW_STARTED`** (new)      |
| Resolve      | ADMIN + `report.review`                       | Resolution note **required** (new)                                                                                        | `REPORT_RESOLVED` (status in metadata) |
| Dismiss      | ADMIN + `report.review`                       | Note **required** (new)                                                                                                   | `REPORT_RESOLVED` (status `DISMISSED`) |
| Re-decide    | —                                             | Terminal reports cannot change (409); repeating the same terminal decision returns it unchanged (idempotent)              | —                                      |

## 2. Moderation actions

| Action                           | Path                                                                                                                   | Evidence preserved                                                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hide / remove a message          | `POST /chat/messages/:id/remove` (staff path: `message.moderate` + reason) — unchanged endpoint, used by the workspace | Soft delete; content copied to `chat_message_edits` (ADR-019); sequence and dedup unchanged; attachment rows and objects kept (downloads refused) |
| Restrict an attachment           | Automatic via malware scan (`INFECTED`/`FAILED`) or retention; staff **release** / **rescan** with grant + reason      | Row, scan metadata, threat name and audit kept; never deleted by moderation                                                                       |
| Escalate to another staff member | Escalation with `assigneeUserId`                                                                                       | Audit history                                                                                                                                     |
| Record a resolution              | Report resolution note / escalation note                                                                               | Stored on the record + audit `reason`                                                                                                             |
| Lock a conversation              | Existing lifecycle endpoint (`conversation.moderate` + reason)                                                         | Unchanged                                                                                                                                         |

Nothing in Phase 7 hard-deletes messages, reports, notes or audit rows. Evidence purges are limited to **stored objects** under the retention policy and never while an evidence hold applies (see `PHASE-7-ATTACHMENT-RETENTION.md`).

## 3. Internal notes

- Separate table `chat_internal_notes` (ADR-008); staff-only endpoints; no outbox event; not in participant history, detail, search, exports, unread counts or sockets.
- Create/delete audited (unchanged); **reading is now audited** (`INTERNAL_NOTE_VIEWED`, count only).
- Verified across REST, search, export, outbox payloads and a live participant socket (integration test with positive control).

## 4. Staff messages

Participant-visible staff messages are ordinary messages sent by staff **after** a visible intervention (MODERATOR membership + `ADMIN_INTERVENTION` audit with reason + "staff joined" system message). Ordering, idempotency (`clientMessageId`), outbox and realtime are the existing ones; participants see the sender's `platformRole` (`ADMIN`) and participant role (`MODERATOR`). There is no way to post into a conversation without becoming a visible participant.

## 5. Not implemented (out of scope)

AI moderation, automatic report triage, per-message notifications, bulk moderation.
