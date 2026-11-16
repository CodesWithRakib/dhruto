import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In, type EntityManager } from "typeorm";
import {
  ChatAuditAction,
  ChatConversationStatus,
  ChatConversationType,
  ChatParticipantCapability,
  ChatParticipantRole,
  ChatParticipantStatus,
  ChatPermission,
  DomainEventType,
  CHAT_UNREAD_SUMMARY_CAP,
  canTransitionConversation,
  transitionRequiresModeration,
  type ChatConversationDetail,
  type ChatConversationPage,
  type ChatParcelContext,
  type ChatUnreadSummary,
  type CreateChatConversationRequest,
  type ListChatConversationsQuery,
} from "@dhruto/contracts";
import {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  Hub,
  Merchant,
  Parcel,
  Rider,
  User,
  UserRole,
  UserStatus,
} from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";
import { type ChatRequestContext } from "../chat.context.js";
import { toConversationSummary } from "../chat.mapper.js";
import {
  CHAT_TYPE_CREATOR_ROLES,
  isEligibleParticipant,
  staffHasPermission,
  type ChatActorScope,
  type ChatConversationScope,
  type ChatParcelScope,
} from "../policies/chat-eligibility.policy.js";
import { ChatAuthorizationService } from "./chat-authorization.service.js";
import { ChatAuditService } from "./chat-audit.service.js";
import { ChatEventsService } from "./chat-events.service.js";
import { ChatMessageReaderService } from "./chat-message-reader.service.js";
import {
  ensureMembership,
  insertParticipants,
  type NewParticipant,
} from "./chat-participant-writer.js";
import {
  ChatParcelMembershipService,
  latestRemovalWasWorkflow,
} from "./chat-parcel-membership.service.js";
import { ChatStaffInterventionService } from "./chat-staff-intervention.service.js";

/**
 * Get-or-create joining an EXISTING conversation as ADMIN (whose eligibility
 * is unconditional) is a staff intervention (Phase 5): it requires a reason,
 * the CONVERSATION_INTERVENE permission, and goes through the audited
 * intervention writer. Natural participants (merchant, rider, customer, hub
 * manager of the current hub) join on the participant path.
 */
interface StaffJoinGuard {
  reason: string | undefined;
  scope: ChatConversationScope;
  parcel: ChatParcelScope | null;
}

export interface CreateConversationResult {
  conversation: ChatConversationDetail;
  created: boolean;
}

interface ListCursor {
  t: string;
  id: string;
}

const STAFF_ROLES: readonly UserRole[] = [UserRole.ADMIN, UserRole.HUB_MANAGER];

/** Unread memberships scanned for the global badge (bounded; badge shows "99+"). */
const UNREAD_SCAN_LIMIT = 200;

/** Conversation lifecycle actions exposed by the API. */
export type ChatStatusAction = "archive" | "close" | "reopen" | "lock" | "unlock";

const ACTION_TARGET: Readonly<Record<ChatStatusAction, ChatConversationStatus>> = {
  archive: ChatConversationStatus.ARCHIVED,
  close: ChatConversationStatus.CLOSED,
  reopen: ChatConversationStatus.ACTIVE,
  lock: ChatConversationStatus.LOCKED,
  unlock: ChatConversationStatus.ACTIVE,
};

/**
 * Conversations: get-or-create, listing, detail, title and lifecycle.
 *
 * Get-or-create is transaction-safe:
 *   - PARCEL_DELIVERY: INSERT ... ON CONFLICT on the partial unique index
 *     `UQ_chat_conversations_parcel_delivery`.
 *   - MERCHANT_DESK / DIRECT: a transaction-scoped advisory lock keyed by the
 *     merchant / sorted user pair serializes concurrent creators.
 */
@Injectable()
export class ChatConversationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authz: ChatAuthorizationService,
    private readonly audit: ChatAuditService,
    private readonly events: ChatEventsService,
    private readonly reader: ChatMessageReaderService,
    private readonly membership: ChatParcelMembershipService,
    private readonly intervention: ChatStaffInterventionService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Create / get-or-create                                            */
  /* ---------------------------------------------------------------- */

  async create(
    ctx: ChatRequestContext,
    req: CreateChatConversationRequest,
  ): Promise<CreateConversationResult> {
    const actor = await this.authz.loadActorScope(ctx.user);
    if (!CHAT_TYPE_CREATOR_ROLES[req.type].includes(actor.role)) {
      throw chatErrors.permissionDenied(`Your role cannot create ${req.type} conversations`);
    }

    let result: { id: string; created: boolean };
    switch (req.type) {
      case ChatConversationType.PARCEL_DELIVERY:
        result = await this.getOrCreateParcelDelivery(ctx, actor, req.parcelId, req.reason);
        break;
      case ChatConversationType.MERCHANT_DESK:
        result = await this.getOrCreateMerchantDesk(ctx, actor, req.merchantId, req.reason);
        break;
      case ChatConversationType.DIRECT:
        result = await this.getOrCreateDirect(ctx, actor, req.participantUserId);
        break;
      case ChatConversationType.SUPPORT_TICKET:
        result = await this.createSupportTicket(ctx, actor, req.title, req.parcelId);
        break;
      case ChatConversationType.HUB_OPERATIONS:
        result = await this.createScoped(ctx, actor, {
          scope: {
            type: req.type,
            parcelId: null,
            hubId: req.hubId,
            merchantId: null,
            createdByUserId: actor.userId,
          },
          title: req.title,
          participantUserIds: req.participantUserIds ?? [],
          requireHub: req.hubId,
        });
        break;
      case ChatConversationType.INTERNAL_SUPERVISOR:
      case ChatConversationType.GROUP:
        result = await this.createScoped(ctx, actor, {
          scope: {
            type: req.type,
            parcelId: null,
            hubId: null,
            merchantId: null,
            createdByUserId: actor.userId,
          },
          title: req.title,
          participantUserIds: req.participantUserIds,
          requireHub: null,
        });
        break;
    }
    return { conversation: await this.getDetail(ctx, result.id), created: result.created };
  }

  private staffRole(actor: ChatActorScope): ChatParticipantRole {
    return STAFF_ROLES.includes(actor.role)
      ? ChatParticipantRole.MODERATOR
      : ChatParticipantRole.MEMBER;
  }

  private async getOrCreateParcelDelivery(
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    parcelId: string,
    reason: string | undefined,
  ): Promise<{ id: string; created: boolean }> {
    const parcel = await this.authz.loadParcelScope(parcelId);
    const scope: ChatConversationScope | null = parcel
      ? {
          type: ChatConversationType.PARCEL_DELIVERY,
          parcelId,
          hubId: null,
          merchantId: parcel.merchantId,
          createdByUserId: actor.userId,
        }
      : null;
    // Same response for "missing" and "not yours": no parcel enumeration.
    if (!parcel || !scope || !isEligibleParticipant(actor, scope, parcel)) {
      throw chatErrors.scopeInvalid("Parcel not found or not accessible");
    }

    return this.dataSource.transaction(async (manager) => {
      const inserted: Array<{ id: string }> = await manager.query(
        `INSERT INTO "chat_conversations" ("type", "parcel_id", "merchant_id", "created_by_user_id")
         VALUES ('PARCEL_DELIVERY', $1, $2, $3)
         ON CONFLICT ("parcel_id") WHERE "type" = 'PARCEL_DELIVERY' DO NOTHING
         RETURNING "id"`,
        [parcelId, parcel.merchantId, actor.userId],
      );

      const insertedId = inserted[0]?.id;
      if (insertedId) {
        const id = insertedId;
        const participants = await this.parcelParticipants(manager, actor, parcel);
        await insertParticipants(manager, id, participants);
        await this.recordCreated(
          manager,
          ctx,
          actor,
          id,
          ChatConversationType.PARCEL_DELIVERY,
          participants,
        );
        return { id, created: true };
      }

      // Lock the thread so reconciliation and the join serialize with the
      // logistics handler and with other openers.
      const existing = await manager.getRepository(ChatConversation).findOneOrFail({
        where: { parcelId, type: ChatConversationType.PARCEL_DELIVERY },
        lock: { mode: "pessimistic_write" },
      });
      // Converge stale rows (e.g. a previous rider) before anyone joins.
      await this.membership.reconcile(manager, existing, parcel, {
        workflow: "access",
        sourceEventId: null,
        sourceEventType: null,
        requestId: ctx.requestId,
      });
      await this.joinExisting(manager, ctx, actor, existing.id, this.staffRole(actor), {
        reason,
        scope: { ...scope, createdByUserId: existing.createdByUserId },
        parcel,
      });
      return { id: existing.id, created: false };
    });
  }

  /** Merchant user, current rider, recipient customer (exact phone), and the creator. */
  private async parcelParticipants(
    manager: EntityManager,
    actor: ChatActorScope,
    parcel: ChatParcelScope,
  ): Promise<NewParticipant[]> {
    const [merchant, rider, customers] = await Promise.all([
      manager
        .getRepository(Merchant)
        .findOne({ where: { id: parcel.merchantId }, select: ["id", "userId"] }),
      parcel.currentRiderId
        ? manager
            .getRepository(Rider)
            .findOne({ where: { id: parcel.currentRiderId }, select: ["id", "userId"] })
        : Promise.resolve(null),
      // Exact match on the unique, indexed phone column — the same identity
      // rule as `isParcelRecipient` and the parcel module (Phase 5).
      manager.getRepository(User).find({
        where: {
          phone: parcel.recipientPhone,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
        select: ["id"],
      }),
    ]);

    const byUser = new Map<string, ChatParticipantRole>();
    if (merchant) byUser.set(merchant.userId, ChatParticipantRole.MEMBER);
    if (rider) byUser.set(rider.userId, ChatParticipantRole.MEMBER);
    for (const customer of customers) byUser.set(customer.id, ChatParticipantRole.MEMBER);
    byUser.set(actor.userId, this.staffRole(actor));
    return [...byUser.entries()].map(([userId, role]) => ({ userId, role }));
  }

  private async getOrCreateMerchantDesk(
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    requestedMerchantId: string | undefined,
    reason: string | undefined,
  ): Promise<{ id: string; created: boolean }> {
    let merchantId: string;
    if (actor.role === UserRole.MERCHANT) {
      if (!actor.merchantId)
        throw chatErrors.forbidden("No merchant profile is associated with this account");
      if (requestedMerchantId && requestedMerchantId !== actor.merchantId) {
        throw chatErrors.scopeInvalid("Merchant not found or not accessible");
      }
      merchantId = actor.merchantId;
    } else {
      if (!requestedMerchantId) throw chatErrors.scopeInvalid("merchantId is required");
      merchantId = requestedMerchantId;
    }

    return this.dataSource.transaction(async (manager) => {
      const merchant = await manager
        .getRepository(Merchant)
        .findOne({ where: { id: merchantId }, select: ["id", "userId"] });
      if (!merchant) throw chatErrors.scopeInvalid("Merchant not found or not accessible");

      await manager.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
        `chat:merchant_desk:${merchantId}`,
      ]);
      const existing = await manager.getRepository(ChatConversation).findOne({
        where: { type: ChatConversationType.MERCHANT_DESK, merchantId },
        select: ["id", "createdByUserId"],
      });
      if (existing) {
        await this.joinExisting(manager, ctx, actor, existing.id, this.staffRole(actor), {
          reason,
          scope: {
            type: ChatConversationType.MERCHANT_DESK,
            parcelId: null,
            hubId: null,
            merchantId,
            createdByUserId: existing.createdByUserId,
          },
          parcel: null,
        });
        return { id: existing.id, created: false };
      }

      const conversation = await manager.getRepository(ChatConversation).save(
        manager.getRepository(ChatConversation).create({
          type: ChatConversationType.MERCHANT_DESK,
          merchantId,
          createdByUserId: actor.userId,
        }),
      );
      const participants: NewParticipant[] = [
        { userId: merchant.userId, role: ChatParticipantRole.MEMBER },
      ];
      if (actor.userId !== merchant.userId) {
        participants.push({ userId: actor.userId, role: this.staffRole(actor) });
      }
      await insertParticipants(manager, conversation.id, participants);
      await this.recordCreated(
        manager,
        ctx,
        actor,
        conversation.id,
        ChatConversationType.MERCHANT_DESK,
        participants,
      );
      return { id: conversation.id, created: true };
    });
  }

  private async getOrCreateDirect(
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    targetUserId: string,
  ): Promise<{ id: string; created: boolean }> {
    const scope: ChatConversationScope = {
      type: ChatConversationType.DIRECT,
      parcelId: null,
      hubId: null,
      merchantId: null,
      createdByUserId: actor.userId,
    };
    await this.authz.assertCanBeAdded(actor, scope, null, [targetUserId]);
    const [a, b] = [actor.userId, targetUserId].sort();

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
        `chat:direct:${a}:${b}`,
      ]);
      const rows: Array<{ id: string }> = await manager.query(
        `SELECT c."id" FROM "chat_conversations" c
           JOIN "chat_participants" pa ON pa."conversation_id" = c."id" AND pa."user_id" = $1
           JOIN "chat_participants" pb ON pb."conversation_id" = c."id" AND pb."user_id" = $2
          WHERE c."type" = 'DIRECT'
          LIMIT 1`,
        [a, b],
      );
      const existingId = rows[0]?.id;
      if (existingId) {
        await this.joinExisting(manager, ctx, actor, existingId, ChatParticipantRole.OWNER);
        return { id: existingId, created: false };
      }
      const conversation = await manager.getRepository(ChatConversation).save(
        manager.getRepository(ChatConversation).create({
          type: ChatConversationType.DIRECT,
          createdByUserId: actor.userId,
        }),
      );
      const participants: NewParticipant[] = [
        { userId: actor.userId, role: ChatParticipantRole.OWNER },
        { userId: targetUserId, role: ChatParticipantRole.OWNER },
      ];
      await insertParticipants(manager, conversation.id, participants);
      await this.recordCreated(
        manager,
        ctx,
        actor,
        conversation.id,
        ChatConversationType.DIRECT,
        participants,
      );
      return { id: conversation.id, created: true };
    });
  }

  private async createSupportTicket(
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    title: string,
    parcelId: string | undefined,
  ): Promise<{ id: string; created: boolean }> {
    let parcel: ChatParcelScope | null = null;
    let merchantId: string | null = actor.role === UserRole.MERCHANT ? actor.merchantId : null;
    if (actor.role === UserRole.MERCHANT && !merchantId) {
      throw chatErrors.forbidden("No merchant profile is associated with this account");
    }
    if (parcelId) {
      parcel = await this.authz.loadParcelScope(parcelId);
      merchantId = parcel?.merchantId ?? null;
    }
    const scope: ChatConversationScope = {
      type: ChatConversationType.SUPPORT_TICKET,
      parcelId: parcelId ?? null,
      hubId: null,
      merchantId,
      createdByUserId: actor.userId,
    };
    if ((parcelId && !parcel) || !isEligibleParticipant(actor, scope, parcel)) {
      throw chatErrors.scopeInvalid("Parcel not found or not accessible");
    }
    return this.dataSource.transaction(async (manager) => {
      const conversation = await manager
        .getRepository(ChatConversation)
        .save(manager.getRepository(ChatConversation).create({ ...scope, title }));
      const participants: NewParticipant[] = [
        { userId: actor.userId, role: ChatParticipantRole.OWNER },
      ];
      await insertParticipants(manager, conversation.id, participants);
      await this.recordCreated(manager, ctx, actor, conversation.id, scope.type, participants);
      return { id: conversation.id, created: true };
    });
  }

  private async createScoped(
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    input: {
      scope: ChatConversationScope;
      title: string;
      participantUserIds: readonly string[];
      requireHub: string | null;
    },
  ): Promise<{ id: string; created: boolean }> {
    if (input.requireHub) {
      const hub = await this.dataSource
        .getRepository(Hub)
        .findOne({ where: { id: input.requireHub }, select: ["id"] });
      if (!hub) throw chatErrors.scopeInvalid("Hub not found or not accessible");
    }
    if (!isEligibleParticipant(actor, input.scope, null)) {
      throw chatErrors.scopeInvalid("Hub not found or not accessible");
    }
    await this.authz.assertCanBeAdded(actor, input.scope, null, input.participantUserIds);

    return this.dataSource.transaction(async (manager) => {
      const conversation = await manager
        .getRepository(ChatConversation)
        .save(
          manager.getRepository(ChatConversation).create({ ...input.scope, title: input.title }),
        );
      const participants: NewParticipant[] = [
        { userId: actor.userId, role: ChatParticipantRole.OWNER },
        ...input.participantUserIds.map((userId) => ({ userId, role: ChatParticipantRole.MEMBER })),
      ];
      await insertParticipants(manager, conversation.id, participants);
      await this.recordCreated(
        manager,
        ctx,
        actor,
        conversation.id,
        input.scope.type,
        participants,
      );
      return { id: conversation.id, created: true };
    });
  }

  /**
   * Get-or-create on an existing conversation: (re)join the caller if allowed.
   *
   * - With `staffGuard` and an ADMIN caller who is not already ACTIVE: the
   *   audited staff intervention path (reason + CONVERSATION_INTERVENE).
   * - Otherwise the participant path. A user REMOVED by the workflow (e.g. a
   *   rider reassigned away and now assigned back) may rejoin while eligible;
   *   a user removed by a moderator may not.
   */
  private async joinExisting(
    manager: EntityManager,
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    conversationId: string,
    role: ChatParticipantRole = this.staffRole(actor),
    staffGuard: StaffJoinGuard | null = null,
  ): Promise<void> {
    if (staffGuard && actor.role === UserRole.ADMIN) {
      const current = await manager.getRepository(ChatParticipant).findOne({
        where: { conversationId, userId: actor.userId },
        select: ["id", "status"],
      });
      if (current?.status === ChatParticipantStatus.ACTIVE) return;
      if (!staffGuard.reason) throw chatErrors.reasonRequired();
      if (
        !staffHasPermission(
          actor,
          ChatPermission.CONVERSATION_INTERVENE,
          staffGuard.scope,
          staffGuard.parcel,
        )
      ) {
        throw chatErrors.permissionDenied("Missing permission to intervene in this conversation");
      }
      await this.intervention.record(manager, ctx, actor, conversationId, staffGuard.reason, {
        via: "get_or_create",
      });
      return;
    }

    const outcome = await ensureMembership(
      manager,
      conversationId,
      { userId: actor.userId, role },
      { allowRemoved: await latestRemovalWasWorkflow(manager, conversationId, actor.userId) },
    );
    if (outcome === "unchanged") return;
    await this.audit.record(manager, {
      action: ChatAuditAction.PARTICIPANT_ADDED,
      actorUserId: actor.userId,
      actorRole: actor.role,
      conversationId,
      targetType: "participant",
      targetId: actor.userId,
      requestId: ctx.requestId,
      metadata: { self: true, outcome },
    });
    await this.events.append(manager, ctx, DomainEventType.CHAT_PARTICIPANT_ADDED, conversationId, {
      userId: actor.userId,
      role,
    });
  }

  private async recordCreated(
    manager: EntityManager,
    ctx: ChatRequestContext,
    actor: ChatActorScope,
    conversationId: string,
    type: ChatConversationType,
    participants: readonly NewParticipant[],
  ): Promise<void> {
    await this.audit.record(manager, {
      action: ChatAuditAction.CONVERSATION_CREATED,
      actorUserId: actor.userId,
      actorRole: actor.role,
      conversationId,
      targetType: "conversation",
      targetId: conversationId,
      requestId: ctx.requestId,
      metadata: { type, participantCount: participants.length },
    });
    await this.events.append(
      manager,
      ctx,
      DomainEventType.CHAT_CONVERSATION_CREATED,
      conversationId,
      {
        type,
        participantUserIds: participants.map((p) => p.userId),
      },
    );
  }

  /* ---------------------------------------------------------------- */
  /* Read                                                              */
  /* ---------------------------------------------------------------- */

  async getDetail(
    ctx: ChatRequestContext,
    conversationId: string,
  ): Promise<ChatConversationDetail> {
    const { conversation, participant } = await this.authz.requireMember(ctx.user, conversationId);
    return this.buildDetail(conversation, participant);
  }

  async buildDetail(
    conversation: ChatConversation,
    me: ChatParticipant,
  ): Promise<ChatConversationDetail> {
    const [participants, lastSender, parcels] = await Promise.all([
      this.reader.activeParticipants(conversation.id),
      this.lastSenders([conversation]),
      this.parcelContexts([conversation]),
    ]);
    return {
      ...toConversationSummary(
        conversation,
        me,
        lastSender.get(conversation.id) ?? null,
        (conversation.parcelId && parcels.get(conversation.parcelId)) || null,
      ),
      participants,
      archivedAt: conversation.archivedAt?.toISOString() ?? null,
      closedAt: conversation.closedAt?.toISOString() ?? null,
      lockedAt: conversation.lockedAt?.toISOString() ?? null,
    };
  }

  /**
   * The caller's own conversations, newest activity first, keyset-paginated
   * over (coalesce(last_message_at, createdAt), id). Fixed query count:
   * ids page + conversations + memberships + parcels (eligibility) + senders.
   */
  async list(
    ctx: ChatRequestContext,
    query: ListChatConversationsQuery,
  ): Promise<ChatConversationPage> {
    const actor = await this.authz.loadActorScope(ctx.user);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;

    const params: unknown[] = [ctx.user.id];
    const where: string[] = [`p."user_id" = $1`, `p."status" = 'ACTIVE'`];
    if (query.type) {
      params.push(query.type);
      where.push(`c."type" = $${params.length}`);
    }
    if (query.status) {
      params.push(query.status);
      where.push(`c."status" = $${params.length}`);
    }
    if (query.unreadOnly) where.push(`c."last_message_sequence" > p."last_read_sequence"`);
    if (cursor) {
      params.push(cursor.t, cursor.id);
      where.push(
        `(coalesce(c."last_message_at", c."createdAt"), c."id") < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
      );
    }
    params.push(query.limit + 1);

    const rows: Array<{ id: string; sort_key: string }> = await this.dataSource.query(
      `SELECT c."id", coalesce(c."last_message_at", c."createdAt")::text AS "sort_key"
         FROM "chat_participants" p
         JOIN "chat_conversations" c ON c."id" = p."conversation_id"
        WHERE ${where.join(" AND ")}
        ORDER BY coalesce(c."last_message_at", c."createdAt") DESC, c."id" DESC
        LIMIT $${params.length}`,
      params,
    );
    const hasMore = rows.length > query.limit;
    const pageRows = rows.slice(0, query.limit);
    const ids = pageRows.map((r) => r.id);
    if (ids.length === 0) return { items: [], nextCursor: null, hasMore: false };

    const [conversations, memberships] = await Promise.all([
      this.dataSource.getRepository(ChatConversation).find({ where: { id: In(ids) } }),
      this.dataSource
        .getRepository(ChatParticipant)
        .find({ where: { conversationId: In(ids), userId: ctx.user.id } }),
    ]);
    const eligible = new Set(
      (await this.authz.filterEligible(actor, conversations)).map((c) => c.id),
    );
    const visible = conversations.filter((c) => eligible.has(c.id));
    const [lastSenders, parcels] = await Promise.all([
      this.lastSenders(visible),
      this.parcelContexts(visible),
    ]);

    const items = ids
      .map((id) => {
        const conversation = conversations.find((c) => c.id === id);
        const me = memberships.find((m) => m.conversationId === id);
        if (!conversation || !me || !eligible.has(id)) return null;
        return toConversationSummary(
          conversation,
          me,
          lastSenders.get(id) ?? null,
          (conversation.parcelId && parcels.get(conversation.parcelId)) || null,
        );
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const last = pageRows[pageRows.length - 1];
    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? this.encodeCursor({ t: last.sort_key, id: last.id }) : null,
    };
  }

  /**
   * Minimal parcel context (id, tracking code, status) for conversations the
   * caller is ALREADY authorized for — one query per page. No recipient
   * contact, address or COD data is ever included.
   */
  private async parcelContexts(
    conversations: readonly ChatConversation[],
  ): Promise<Map<string, ChatParcelContext>> {
    const parcelIds = [
      ...new Set(conversations.map((c) => c.parcelId).filter((id): id is string => id !== null)),
    ];
    const result = new Map<string, ChatParcelContext>();
    if (parcelIds.length === 0) return result;
    const parcels = await this.dataSource.getRepository(Parcel).find({
      where: { id: In(parcelIds) },
      select: ["id", "trackingCode", "status"],
    });
    for (const p of parcels) {
      result.set(p.id, { id: p.id, trackingCode: p.trackingCode, status: p.status });
    }
    return result;
  }

  /**
   * Global unread indicator (Phase 5): accessible, unmuted conversations with
   * unread messages, counted up to CHAT_UNREAD_SUMMARY_CAP. Bounded scan of
   * the caller's newest unread memberships, then live-eligibility filtering
   * (stale rows never count).
   */
  async unreadSummary(ctx: ChatRequestContext): Promise<ChatUnreadSummary> {
    const actor = await this.authz.loadActorScope(ctx.user);
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT c."id"
         FROM "chat_participants" p
         JOIN "chat_conversations" c ON c."id" = p."conversation_id"
        WHERE p."user_id" = $1
          AND p."status" = 'ACTIVE'
          AND c."last_message_sequence" > p."last_read_sequence"
          AND NOT (p."is_muted" AND (p."muted_until" IS NULL OR p."muted_until" > now()))
        ORDER BY c."last_message_at" DESC NULLS LAST
        LIMIT $2`,
      [ctx.user.id, UNREAD_SCAN_LIMIT],
    );
    if (rows.length === 0) return { unreadConversations: 0, capped: false };
    const conversations = await this.dataSource
      .getRepository(ChatConversation)
      .find({ where: { id: In(rows.map((r) => r.id)) } });
    const eligible = (await this.authz.filterEligible(actor, conversations)).length;
    return {
      unreadConversations: Math.min(eligible, CHAT_UNREAD_SUMMARY_CAP),
      capped: eligible > CHAT_UNREAD_SUMMARY_CAP,
    };
  }

  private async lastSenders(
    conversations: readonly ChatConversation[],
  ): Promise<Map<string, string | null>> {
    const messageIds = conversations
      .map((c) => c.lastMessageId)
      .filter((id): id is string => id !== null);
    const result = new Map<string, string | null>();
    if (messageIds.length === 0) return result;
    const messages = await this.dataSource.getRepository(ChatMessage).find({
      where: { id: In(messageIds) },
      select: ["id", "conversationId", "senderUserId"],
    });
    for (const m of messages) result.set(m.conversationId, m.senderUserId);
    return result;
  }

  private encodeCursor(cursor: ListCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
  }

  private decodeCursor(raw: string): ListCursor {
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
        /^[0-9a-f-]{36}$/i.test(parsed.id)
      ) {
        return { t: parsed.t, id: parsed.id };
      }
    } catch {
      // fall through
    }
    throw chatErrors.cursorInvalid();
  }

  /* ---------------------------------------------------------------- */
  /* Update / lifecycle                                                */
  /* ---------------------------------------------------------------- */

  async updateTitle(
    ctx: ChatRequestContext,
    conversationId: string,
    title: string,
  ): Promise<ChatConversationDetail> {
    const { conversation, participant } = await this.authz.requireMember(ctx.user, conversationId, {
      capability: ChatParticipantCapability.CHANGE_STATUS,
      requireWritable: true,
    });
    if (conversation.type === ChatConversationType.DIRECT) {
      throw chatErrors.scopeInvalid("Direct conversations have no title");
    }
    await this.dataSource.getRepository(ChatConversation).update({ id: conversationId }, { title });
    conversation.title = title;
    return this.buildDetail(conversation, participant);
  }

  /**
   * Lifecycle transition. Participants with CHANGE_STATUS (OWNER/MODERATOR)
   * may archive/close/reopen; staff with scoped CONVERSATION_MODERATE may do
   * the same with a reason. Entering or leaving LOCKED always requires the
   * staff permission AND a reason. The transition is validated under a row
   * lock, so concurrent changes cannot skip the state machine.
   */
  async changeStatus(
    ctx: ChatRequestContext,
    conversationId: string,
    action: ChatStatusAction,
    reason: string | undefined,
  ): Promise<{ id: string; status: ChatConversationStatus }> {
    const target = ACTION_TARGET[action];
    const access = await this.authz.resolveAccess(ctx.user, conversationId, {
      capability: ChatParticipantCapability.CHANGE_STATUS,
      staffPermission: ChatPermission.CONVERSATION_MODERATE,
      reason,
    });

    return this.dataSource.transaction(async (manager) => {
      const conversation = await manager.getRepository(ChatConversation).findOneOrFail({
        where: { id: conversationId },
        lock: { mode: "pessimistic_write" },
      });
      const from = conversation.status;
      if (action === "unlock" && from !== ChatConversationStatus.LOCKED) {
        throw chatErrors.invalidTransition(from, target);
      }
      if (action === "reopen" && from === ChatConversationStatus.LOCKED) {
        throw chatErrors.invalidTransition(from, target);
      }
      if (!canTransitionConversation(from, target))
        throw chatErrors.invalidTransition(from, target);
      if (transitionRequiresModeration(from, target)) {
        if (
          !staffHasPermission(
            access.actor,
            ChatPermission.CONVERSATION_MODERATE,
            conversation,
            access.parcel,
          )
        ) {
          throw chatErrors.permissionDenied("Locking and unlocking require moderation permission");
        }
        if (!reason) throw chatErrors.reasonRequired();
      }

      const now = new Date();
      await manager.getRepository(ChatConversation).update(
        { id: conversationId },
        {
          status: target,
          ...(target === ChatConversationStatus.ARCHIVED ? { archivedAt: now } : {}),
          ...(target === ChatConversationStatus.CLOSED ? { closedAt: now } : {}),
          ...(target === ChatConversationStatus.LOCKED ? { lockedAt: now } : {}),
        },
      );
      await this.audit.record(manager, {
        action: ChatAuditAction.CONVERSATION_STATUS_CHANGED,
        actorUserId: access.actor.userId,
        actorRole: access.actor.role,
        conversationId,
        targetType: "conversation",
        targetId: conversationId,
        reason: reason ?? null,
        requestId: ctx.requestId,
        metadata: { from, to: target, path: access.path },
      });
      const eventType =
        target === ChatConversationStatus.ARCHIVED
          ? DomainEventType.CHAT_CONVERSATION_ARCHIVED
          : target === ChatConversationStatus.CLOSED
            ? DomainEventType.CHAT_CONVERSATION_CLOSED
            : DomainEventType.CHAT_CONVERSATION_STATUS_CHANGED;
      await this.events.append(manager, ctx, eventType, conversationId, { from, to: target });
      return { id: conversationId, status: target };
    });
  }
}
