import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import {
  CHAT_ESCALATION_ACTIVE_STATUSES,
  CHAT_METRICS_VOLUME_DAYS,
  ChatAuditAction,
  ChatPermission,
  computeChatUnreadCount,
  type AdminChatInboxQuery,
  type ChatAdminMetrics,
  type ChatConversationStatus,
  type ChatConversationType,
  type ChatEscalationStatus,
  type ChatInboxItem,
  type ChatInboxPage,
  type ChatStaffProfile,
  type ParcelStatus,
} from "@dhruto/contracts";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { actorHoldsChatPermission } from "../policies/chat-eligibility.policy.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";

interface InboxRow {
  id: string;
  type: ChatConversationType;
  title: string | null;
  status: ChatConversationStatus;
  parcel_id: string | null;
  hub_id: string | null;
  merchant_id: string | null;
  last_message_sequence: string;
  activity_at: Date;
  activity_key: string;
  created_at: Date;
  escalation_status: ChatEscalationStatus | null;
  escalation_assignee_user_id: string | null;
  escalation_updated_at: Date | null;
  assignee_name: string | null;
  tracking_code: string | null;
  parcel_status: ParcelStatus | null;
  hub_name: string | null;
  merchant_name: string | null;
  active_participants: number;
  open_reports: number;
  my_last_read: string | null;
  last_message_preview: string | null;
}

interface InboxCursor {
  t: string;
  id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPEN_REPORT_STATUSES = `('OPEN', 'UNDER_REVIEW')`;
const ACTIVE_ESCALATIONS = `(${CHAT_ESCALATION_ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ")})`;

/**
 * Phase 7 operational inbox, metrics and the caller's effective staff
 * profile. Platform scope: ADMIN + `CONVERSATION_VIEW_ANY`.
 *
 * The inbox returns conversation METADATA (type, status, parcel code,
 * scope names, counts, escalation). Content (last-message preview, unread)
 * is included only for conversations where the caller is already an ACTIVE
 * participant — reading any other conversation's content still goes through
 * the reason-gated, audited staff view. Listing is audited
 * (`ADMIN_CONVERSATIONS_LISTED`) without storing the search text.
 */
@Injectable()
export class ChatAdminInboxService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
  ) {}

  async staffProfile(ctx: ChatRequestContext): Promise<ChatStaffProfile> {
    const actor = await this.authz.loadActorScope(ctx.user);
    return {
      userId: actor.userId,
      role: actor.role,
      permissions: Object.values(ChatPermission).filter((p) => actorHoldsChatPermission(actor, p)),
      hubIds: [...actor.managedHubIds],
    };
  }

  async inbox(ctx: ChatRequestContext, query: AdminChatInboxQuery): Promise<ChatInboxPage> {
    const actor = await this.authz.requirePlatformStaff(
      ctx.user,
      ChatPermission.CONVERSATION_VIEW_ANY,
    );
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const params: unknown[] = [actor.userId];
    const where: string[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (!actorHoldsChatPermission(actor, ChatPermission.CONVERSATION_VIEW_RESTRICTED)) {
      where.push(`c."type" <> 'INTERNAL_SUPERVISOR'`);
    }
    if (query.type) where.push(`c."type" = ${bind(query.type)}`);
    if (query.status) where.push(`c."status" = ${bind(query.status)}`);
    if (query.merchantId) where.push(`c."merchant_id" = ${bind(query.merchantId)}`);
    if (query.parcelId) where.push(`c."parcel_id" = ${bind(query.parcelId)}`);
    if (query.hubId) {
      const hub = bind(query.hubId);
      where.push(`(c."hub_id" = ${hub} OR p."current_hub_id" = ${hub})`);
    }
    if (query.riderId) where.push(`p."current_rider_id" = ${bind(query.riderId)}`);
    if (query.parcelStatus) where.push(`p."status" = ${bind(query.parcelStatus)}`);
    if (query.participantUserId) {
      where.push(
        `EXISTS (SELECT 1 FROM "chat_participants" pu WHERE pu."conversation_id" = c."id"
                  AND pu."user_id" = ${bind(query.participantUserId)} AND pu."status" = 'ACTIVE')`,
      );
    }
    if (query.escalation === "ACTIVE") {
      where.push(`c."escalation_status" IN ${ACTIVE_ESCALATIONS}`);
    } else if (query.escalation === "NONE") {
      where.push(`c."escalation_status" IS NULL`);
    } else if (query.escalation) {
      where.push(`c."escalation_status" = ${bind(query.escalation)}`);
    }
    if (query.assignedToMe) where.push(`c."escalation_assignee_user_id" = $1`);
    if (query.hasOpenReports !== undefined) {
      where.push(
        `${query.hasOpenReports ? "" : "NOT "}EXISTS (SELECT 1 FROM "chat_reports" r
           WHERE r."conversation_id" = c."id" AND r."status" IN ${OPEN_REPORT_STATUSES})`,
      );
    }
    if (query.from)
      where.push(
        `COALESCE(c."last_message_at", c."createdAt") >= ${bind(query.from)}::timestamptz`,
      );
    if (query.to)
      where.push(`COALESCE(c."last_message_at", c."createdAt") <= ${bind(query.to)}::timestamptz`);
    if (query.q) {
      // Exact identifier lookups only (index-backed): conversation id, report id, tracking code.
      if (UUID_RE.test(query.q)) {
        const id = bind(query.q.toLowerCase());
        where.push(
          `(c."id" = ${id}::uuid OR EXISTS (SELECT 1 FROM "chat_reports" rq
             WHERE rq."id" = ${id}::uuid AND rq."conversation_id" = c."id"))`,
        );
      } else {
        where.push(`p."tracking_code" = ${bind(query.q.toUpperCase())}`);
      }
    }
    if (cursor) {
      const t = bind(cursor.t);
      const id = bind(cursor.id);
      where.push(
        `(COALESCE(c."last_message_at", c."createdAt"), c."id") < (${t}::timestamptz, ${id}::uuid)`,
      );
    }
    const limit = bind(query.limit + 1);

    return this.dataSource.transaction(async (manager) => {
      const rows: InboxRow[] = await manager.query(
        `SELECT c."id", c."type", c."title", c."status", c."parcel_id",
                COALESCE(c."hub_id", p."current_hub_id") AS "hub_id", c."merchant_id",
                c."last_message_sequence"::text AS "last_message_sequence",
                COALESCE(c."last_message_at", c."createdAt") AS "activity_at",
                COALESCE(c."last_message_at", c."createdAt")::text AS "activity_key",
                c."createdAt" AS "created_at",
                c."escalation_status", c."escalation_assignee_user_id", c."escalation_updated_at",
                au."name" AS "assignee_name",
                p."tracking_code", p."status" AS "parcel_status",
                h."name" AS "hub_name", m."business_name" AS "merchant_name",
                (SELECT count(*)::int FROM "chat_participants" cp
                  WHERE cp."conversation_id" = c."id" AND cp."status" = 'ACTIVE') AS "active_participants",
                (SELECT count(*)::int FROM "chat_reports" r
                  WHERE r."conversation_id" = c."id" AND r."status" IN ${OPEN_REPORT_STATUSES}) AS "open_reports",
                me."last_read_sequence"::text AS "my_last_read",
                CASE WHEN me."id" IS NOT NULL THEN c."last_message_preview" END AS "last_message_preview"
           FROM "chat_conversations" c
           LEFT JOIN "parcels" p ON p."id" = c."parcel_id"
           LEFT JOIN "hubs" h ON h."id" = COALESCE(c."hub_id", p."current_hub_id")
           LEFT JOIN "merchants" m ON m."id" = c."merchant_id"
           LEFT JOIN "users" au ON au."id" = c."escalation_assignee_user_id"
           LEFT JOIN "chat_participants" me
             ON me."conversation_id" = c."id" AND me."user_id" = $1 AND me."status" = 'ACTIVE'
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY COALESCE(c."last_message_at", c."createdAt") DESC, c."id" DESC
          LIMIT ${limit}`,
        params,
      );
      const hasMore = rows.length > query.limit;
      const page = rows.slice(0, query.limit);
      await this.audit.record(manager, {
        action: ChatAuditAction.ADMIN_CONVERSATIONS_LISTED,
        actorUserId: actor.userId,
        actorRole: actor.role,
        requestId: ctx.requestId,
        metadata: {
          view: "inbox",
          filters: {
            type: query.type ?? null,
            status: query.status ?? null,
            merchantId: query.merchantId ?? null,
            hubId: query.hubId ?? null,
            parcelId: query.parcelId ?? null,
            riderId: query.riderId ?? null,
            parcelStatus: query.parcelStatus ?? null,
            participantUserId: query.participantUserId ?? null,
            escalation: query.escalation ?? null,
            hasOpenReports: query.hasOpenReports ?? null,
            assignedToMe: query.assignedToMe ?? null,
            search: query.q ? true : null,
          },
          count: page.length,
        },
      });
      const last = page[page.length - 1];
      return {
        items: page.map(toInboxItem),
        hasMore,
        nextCursor: hasMore && last ? encodeCursor({ t: last.activity_key, id: last.id }) : null,
      };
    });
  }

  async metrics(ctx: ChatRequestContext): Promise<ChatAdminMetrics> {
    const actor = await this.authz.requirePlatformStaff(
      ctx.user,
      ChatPermission.CONVERSATION_VIEW_ANY,
    );
    const [[counts], byType, volume] = await Promise.all([
      this.dataSource.query(
        `SELECT
           (SELECT count(*)::int FROM "chat_conversations") AS "total",
           (SELECT count(*)::int FROM "chat_conversations" WHERE "status" = 'ACTIVE') AS "active",
           (SELECT count(*)::int FROM "chat_conversations" WHERE "escalation_status" = 'OPEN') AS "esc_open",
           (SELECT count(*)::int FROM "chat_conversations" WHERE "escalation_status" = 'IN_REVIEW') AS "esc_review",
           (SELECT count(*)::int FROM "chat_conversations" WHERE "escalation_status" = 'ESCALATED') AS "esc_escalated",
           (SELECT count(*)::int FROM "chat_conversations"
             WHERE "escalation_assignee_user_id" = $1 AND "escalation_status" IN ${ACTIVE_ESCALATIONS}) AS "esc_mine",
           (SELECT count(*)::int FROM "chat_reports" WHERE "status" = 'OPEN') AS "reports_open",
           (SELECT count(*)::int FROM "chat_reports" WHERE "status" = 'UNDER_REVIEW') AS "reports_review",
           (SELECT count(*)::int FROM (
               SELECT "id" FROM "chat_conversations" WHERE "escalation_status" IN ${ACTIVE_ESCALATIONS}
               UNION
               SELECT "conversation_id" FROM "chat_reports" WHERE "status" IN ${OPEN_REPORT_STATUSES}
             ) x) AS "attention",
           (SELECT count(*)::int FROM "chat_audit_logs"
             WHERE "action" = 'ADMIN_INTERVENTION' AND "createdAt" >= now() - interval '7 days') AS "interventions",
           (SELECT count(*)::int FROM "chat_attachments"
             WHERE "status" = 'UPLOADED' AND "scan_status" = 'PENDING') AS "scan_pending",
           (SELECT count(*)::int FROM "chat_attachments"
             WHERE "scan_status" IN ('INFECTED', 'FAILED')) AS "scan_blocked",
           (SELECT count(*)::int FROM "chat_participants" pp
              JOIN "chat_conversations" pc ON pc."id" = pp."conversation_id"
             WHERE pp."user_id" = $1 AND pp."status" = 'ACTIVE'
               AND pc."last_message_sequence" > pp."last_read_sequence") AS "my_unread"`,
        [actor.userId],
      ),
      this.dataSource.query(
        `SELECT "type", count(*)::int AS "count" FROM "chat_conversations" GROUP BY "type"`,
      ) as Promise<Array<{ type: string; count: number }>>,
      this.dataSource.query(
        `SELECT to_char(d.day, 'YYYY-MM-DD') AS "day", count(c."id")::int AS "count"
           FROM generate_series(
                  date_trunc('day', now() AT TIME ZONE 'UTC') - ($1::int - 1) * interval '1 day',
                  date_trunc('day', now() AT TIME ZONE 'UTC'),
                  interval '1 day') AS d(day)
           LEFT JOIN "chat_conversations" c
             ON c."createdAt" >= d.day AT TIME ZONE 'UTC'
            AND c."createdAt" < (d.day + interval '1 day') AT TIME ZONE 'UTC'
          GROUP BY d.day ORDER BY d.day`,
        [CHAT_METRICS_VOLUME_DAYS],
      ) as Promise<Array<{ day: string; count: number }>>,
    ]);
    return {
      generatedAt: new Date().toISOString(),
      conversations: {
        total: counts.total,
        active: counts.active,
        byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
      },
      myUnreadConversations: counts.my_unread,
      escalations: {
        open: counts.esc_open,
        inReview: counts.esc_review,
        escalated: counts.esc_escalated,
        assignedToMe: counts.esc_mine,
      },
      reports: { open: counts.reports_open, underReview: counts.reports_review },
      needsAttention: counts.attention,
      interventionsLast7Days: counts.interventions,
      attachments: { scanPending: counts.scan_pending, blocked: counts.scan_blocked },
      conversationVolume: volume,
    };
  }
}

function toInboxItem(row: InboxRow): ChatInboxItem {
  const isParticipant = row.my_last_read !== null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    status: row.status,
    parcel:
      row.parcel_id && row.tracking_code && row.parcel_status
        ? { id: row.parcel_id, trackingCode: row.tracking_code, status: row.parcel_status }
        : null,
    hubId: row.hub_id,
    hubName: row.hub_name,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    lastActivityAt: new Date(row.activity_at).toISOString(),
    lastMessageSequence: row.last_message_sequence,
    activeParticipantCount: row.active_participants,
    isParticipant,
    lastMessagePreview: isParticipant ? row.last_message_preview : null,
    unreadCount:
      isParticipant && row.my_last_read !== null
        ? computeChatUnreadCount(row.last_message_sequence, row.my_last_read)
        : null,
    openReportCount: row.open_reports,
    escalation:
      row.escalation_status && row.escalation_updated_at
        ? {
            status: row.escalation_status,
            assigneeUserId: row.escalation_assignee_user_id,
            assigneeName: row.assignee_name,
            updatedAt: new Date(row.escalation_updated_at).toISOString(),
          }
        : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function encodeCursor(cursor: InboxCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(raw: string): InboxCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "t" in parsed &&
      "id" in parsed &&
      typeof parsed.t === "string" &&
      typeof parsed.id === "string" &&
      !Number.isNaN(Date.parse(parsed.t)) &&
      UUID_RE.test(parsed.id)
    ) {
      return { t: parsed.t, id: parsed.id };
    }
  } catch {
    // fall through
  }
  throw chatErrors.cursorInvalid();
}
