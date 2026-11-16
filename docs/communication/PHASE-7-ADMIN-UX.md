# Communication Platform — Phase 7 Admin UX

Location: `apps/web-merchant/features/chat-admin/` (new feature folder), routes `app/[locale]/(admin)/admin/communications/` and `…/communications/[conversationId]/`. Admin navigation: **Operations → Communication Center** (`ShieldAlert` icon). Built with the existing Next.js App Router, RTK Query `baseApi`, `@dhruto/ui`, shared state components (`components/feedback/states.tsx`), `ToneBadge`, next-intl (`ChatAdmin` namespace, en + bn).

## 1. Structure

| Surface                | Component                                             | Data                                                                                                                        |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Center shell + tabs    | `communication-center.tsx` (tab in `?tab=`)           | `GET /chat/admin/me` decides visible tabs                                                                                   |
| Overview               | `overview-panel.tsx`                                  | `GET /chat/admin/metrics` (polled 60 s while focused); tiles link to queues; 14-day bar list with screen-reader text        |
| Inbox                  | `inbox-panel.tsx`                                     | `GET /chat/admin/inbox` infinite query; filters: search (exact ids), type, status, escalation, open reports, assigned to me |
| Escalation queue       | `inbox-panel.tsx` with `escalation=ACTIVE`            | same                                                                                                                        |
| Report queue           | `reports-panel.tsx`                                   | reports list; start review; resolve/dismiss via note dialog                                                                 |
| Attachment security    | `attachments-panel.tsx`, `attachment-review-list.tsx` | quarantine queue + retention (grant-gated; "restricted area" state without grants, no request made)                         |
| Audit                  | `audit-panel.tsx`                                     | audit log with action filter                                                                                                |
| Conversation workspace | `workspace/conversation-workspace.tsx`                | Reason gate → detail, history, attachments, reports, participants, escalation, notes, audit                                 |

## 2. Workspace flow

1. Admin opens a row → **reason gate** (≥ 10 chars). The reason lives in component state for this visit only; it accompanies every content read (detail, history pages, attachment metadata) and is audited server-side.
2. Workspace shows: header (type, lifecycle, created, parcel link), **read-only audited history** (sender name + platform role; system events localized; deleted messages shown as deleted; attachment names with scan state; "Remove message" for `message.moderate` with a reason), attachments with scan state and grant-gated actions, reports for this conversation, participants, escalation card (allowed next steps from the shared transition table, note dialog, history), internal notes (private banner), audit trail.
3. **Join as staff** (intervene, reason dialog). Afterwards **Open in messenger** goes to the existing `/admin/messages/:id`, where participant-visible staff messages are sent with the normal composer, timeline, socket and idempotency.

**Why a read-only history instead of the messenger timeline:** the messenger timeline is bound to participant endpoints, read receipts and the socket. The pre-intervention investigation must use the reason-gated admin endpoint and must not mark anything read or appear present. Reusing the messenger for actual messaging (after visible intervention) keeps one sending implementation.

## 3. Participant messenger change

`attachment-security-gate.tsx` wraps each attachment: `CLEAN` renders as before; `PENDING` shows "Security check in progress…" and polls the authorized download endpoint every 10 s (focused tab only) until it returns a URL or "blocked"; `INFECTED`/`FAILED` show "Blocked for security reasons" and never load content.

## 4. States and accessibility

- Every panel renders loading, error (with retry), empty, and unauthorized/restricted states via the shared components.
- Native `<select>`/checkbox controls with labels; search is a `role="search"` form; lists are labelled; badges carry text (not color only); dialogs from `@dhruto/ui` (focus-trapped, Escape closes); RTL-safe icons (`rtl:rotate-180` on back arrow).
- Layout: single column on mobile (tabs scroll horizontally, 16 px gutters), two-column workspace from `lg`, metric grid 2 → 4 columns.
- Restrained styling: plain cards (`bg-card`, rounded, no extra borders/shadows), no decorative graphics, metrics from live data only.

## 5. Permission awareness

Tabs and actions are shown from `GET /chat/admin/me` (effective permissions including grants). This is presentation only — every action is re-authorized by the backend. Hub managers and other roles have no navigation entry; direct navigation renders the unauthorized state (API answers 403).

## 6. Known UX limitations

- Queues refresh on actions, focus and polling (metrics); there is no staff realtime channel.
- Inbox search matches exact identifiers only (no free-text content search for staff, by design).
- The read-only history does not render media previews; staff use the grant-gated download.
- Escalation assignment UI assigns to "me" when taking a case; assigning to another admin is API-supported but has no user picker yet (no staff directory endpoint exists).
