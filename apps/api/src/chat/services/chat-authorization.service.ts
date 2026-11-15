import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In, type EntityManager } from "typeorm";
import {
  ChatParticipantStatus,
  isConversationWritable,
  participantHasCapability,
  type ChatParticipantCapability,
  type ChatPermission,
} from "@dhruto/contracts";
import {
  ChatConversation,
  ChatParticipant,
  HubUserAssignment,
  Merchant,
  Parcel,
  Rider,
  User,
  UserRole,
  UserStatus,
} from "../../database/entities/index.js";
import { type AuthenticatedUser } from "../../auth/jwt/jwt.interface.js";
import { chatErrors } from "../chat.errors.js";
import {
  CHAT_HUB_SHARING_TYPES,
  isEligibleParticipant,
  sharesHub,
  staffHasPermission,
  type ChatActorScope,
  type ChatConversationScope,
  type ChatParcelScope,
} from "../policies/chat-eligibility.policy.js";

export interface ChatMemberAccess {
  actor: ChatActorScope;
  conversation: ChatConversation;
  participant: ChatParticipant;
  parcel: ChatParcelScope | null;
}

export type ChatAccessPath = "participant" | "staff";

export interface ChatResolvedAccess {
  path: ChatAccessPath;
  actor: ChatActorScope;
  conversation: ChatConversation;
  /** Present on the participant path. */
  participant: ChatParticipant | null;
  parcel: ChatParcelScope | null;
}

export interface ChatAccessRequirement {
  /** In-conversation capability that grants the action to a participant. */
  capability: ChatParticipantCapability;
  /** Staff permission that grants the action to a non-participant / non-capable actor. */
  staffPermission: ChatPermission | null;
  /** Staff justification; mandatory on the staff path. */
  reason?: string;
  /** Require ACTIVE conversation on the participant path. */
  requireWritable?: boolean;
}

/**
 * Single place where chat access is decided. Every conversation-scoped
 * operation resolves through `requireMember` or `resolveAccess`.
 *
 * Facts (role, merchant, rider, hub assignments, parcel assignment) are read
 * from the database on each request. JWT claims are used only for identity
 * (`user.id`), so stale tokens cannot carry stale privileges.
 */
@Injectable()
export class ChatAuthorizationService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private em(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }

  /* ---------------------------------------------------------------- */
  /* Scope loading                                                     */
  /* ---------------------------------------------------------------- */

  /** Loads the acting user's scope; inactive or missing accounts are rejected. */
  async loadActorScope(user: AuthenticatedUser, manager?: EntityManager): Promise<ChatActorScope> {
    const scopes = await this.loadScopesForUsers([user.id], manager);
    const scope = scopes.get(user.id);
    if (!scope) throw chatErrors.forbidden("Account is not active");
    return scope;
  }

  /**
   * Batch scope loader (4 queries regardless of count). Only ACTIVE users are
   * returned, so suspended/inactive accounts are never eligible.
   */
  async loadScopesForUsers(
    userIds: readonly string[],
    manager?: EntityManager,
  ): Promise<Map<string, ChatActorScope>> {
    const result = new Map<string, ChatActorScope>();
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return result;
    const em = this.em(manager);

    const users = await em.getRepository(User).find({
      where: { id: In(ids), status: UserStatus.ACTIVE },
      select: ["id", "role", "phone"],
    });
    if (users.length === 0) return result;

    const merchantUserIds = users.filter((u) => u.role === UserRole.MERCHANT).map((u) => u.id);
    const riderUserIds = users.filter((u) => u.role === UserRole.RIDER).map((u) => u.id);
    const managerUserIds = users.filter((u) => u.role === UserRole.HUB_MANAGER).map((u) => u.id);

    const [merchants, riders, assignments] = await Promise.all([
      merchantUserIds.length
        ? em.getRepository(Merchant).find({
            where: { userId: In(merchantUserIds) },
            select: ["id", "userId"],
          })
        : Promise.resolve([]),
      riderUserIds.length
        ? em.getRepository(Rider).find({
            where: { userId: In(riderUserIds) },
            select: ["id", "userId", "hubId"],
          })
        : Promise.resolve([]),
      managerUserIds.length
        ? em.getRepository(HubUserAssignment).find({
            where: { userId: In(managerUserIds), isActive: true },
            select: ["userId", "hubId"],
          })
        : Promise.resolve([]),
    ]);

    for (const user of users) {
      const merchant = merchants.find((m) => m.userId === user.id);
      const rider = riders.find((r) => r.userId === user.id);
      result.set(user.id, {
        userId: user.id,
        role: user.role,
        phone: user.phone,
        merchantId: merchant?.id ?? null,
        riderId: rider?.id ?? null,
        riderHubId: rider?.hubId ?? null,
        managedHubIds: assignments.filter((a) => a.userId === user.id).map((a) => a.hubId),
      });
    }
    return result;
  }

  async loadParcelScopes(
    parcelIds: readonly string[],
    manager?: EntityManager,
  ): Promise<Map<string, ChatParcelScope>> {
    const result = new Map<string, ChatParcelScope>();
    const ids = [...new Set(parcelIds)];
    if (ids.length === 0) return result;
    const parcels = await this.em(manager)
      .getRepository(Parcel)
      .find({
        where: { id: In(ids) },
        select: ["id", "merchantId", "currentRiderId", "currentHubId", "recipientPhone"],
      });
    for (const p of parcels) {
      result.set(p.id, {
        id: p.id,
        merchantId: p.merchantId,
        currentRiderId: p.currentRiderId,
        currentHubId: p.currentHubId,
        recipientPhone: p.recipientPhone,
      });
    }
    return result;
  }

  async loadParcelScope(
    parcelId: string | null,
    manager?: EntityManager,
  ): Promise<ChatParcelScope | null> {
    if (!parcelId) return null;
    return (await this.loadParcelScopes([parcelId], manager)).get(parcelId) ?? null;
  }

  /* ---------------------------------------------------------------- */
  /* Access decisions                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Requires an ACTIVE, currently-eligible membership. Anything else is a 404
   * (no existence leak). Optionally checks a capability (403) and that the
   * conversation accepts writes (409).
   */
  async requireMember(
    user: AuthenticatedUser,
    conversationId: string,
    options: { capability?: ChatParticipantCapability; requireWritable?: boolean } = {},
    manager?: EntityManager,
  ): Promise<ChatMemberAccess> {
    const em = this.em(manager);
    const [actor, conversation, participant] = await Promise.all([
      this.loadActorScope(user, manager),
      em.getRepository(ChatConversation).findOne({ where: { id: conversationId } }),
      em.getRepository(ChatParticipant).findOne({ where: { conversationId, userId: user.id } }),
    ]);
    if (!conversation || !participant || participant.status !== ChatParticipantStatus.ACTIVE) {
      throw chatErrors.conversationNotFound();
    }
    const parcel = await this.loadParcelScope(conversation.parcelId, manager);
    if (!isEligibleParticipant(actor, conversation, parcel)) {
      throw chatErrors.conversationNotFound();
    }
    if (
      options.capability &&
      !participantHasCapability(participant.role, participant.status, options.capability)
    ) {
      throw chatErrors.forbidden(
        `Your role in this conversation does not allow ${options.capability}`,
      );
    }
    if (options.requireWritable && !isConversationWritable(conversation.status)) {
      throw chatErrors.notWritable(conversation.status);
    }
    return { actor, conversation, participant, parcel };
  }

  /**
   * Participant-or-staff access. The participant path wins when the caller is
   * an active, eligible member holding `capability`. Otherwise the staff path
   * applies: the scoped staff permission is required AND a reason (the caller
   * must audit it). Visible-but-not-capable members get 403; everyone else 404.
   */
  async resolveAccess(
    user: AuthenticatedUser,
    conversationId: string,
    requirement: ChatAccessRequirement,
    manager?: EntityManager,
  ): Promise<ChatResolvedAccess> {
    const em = this.em(manager);
    const [actor, conversation, participant] = await Promise.all([
      this.loadActorScope(user, manager),
      em.getRepository(ChatConversation).findOne({ where: { id: conversationId } }),
      em.getRepository(ChatParticipant).findOne({ where: { conversationId, userId: user.id } }),
    ]);
    if (!conversation) throw chatErrors.conversationNotFound();
    const parcel = await this.loadParcelScope(conversation.parcelId, manager);

    const isVisibleMember =
      participant !== null &&
      participant.status === ChatParticipantStatus.ACTIVE &&
      isEligibleParticipant(actor, conversation, parcel);

    if (
      isVisibleMember &&
      participantHasCapability(participant.role, participant.status, requirement.capability)
    ) {
      if (requirement.requireWritable && !isConversationWritable(conversation.status)) {
        throw chatErrors.notWritable(conversation.status);
      }
      return { path: "participant", actor, conversation, participant, parcel };
    }

    if (
      requirement.staffPermission &&
      staffHasPermission(actor, requirement.staffPermission, conversation, parcel)
    ) {
      if (!requirement.reason || requirement.reason.trim().length === 0) {
        throw chatErrors.reasonRequired();
      }
      return {
        path: "staff",
        actor,
        conversation,
        participant: isVisibleMember ? participant : null,
        parcel,
      };
    }

    if (isVisibleMember) {
      throw chatErrors.forbidden(
        `Your role in this conversation does not allow ${requirement.capability}`,
      );
    }
    throw chatErrors.conversationNotFound();
  }

  /** Staff-only access (admin endpoints). Non-holders get 404 (no existence leak). */
  async requireStaff(
    user: AuthenticatedUser,
    conversationId: string,
    permissions: readonly ChatPermission[],
    manager?: EntityManager,
  ): Promise<{
    actor: ChatActorScope;
    conversation: ChatConversation;
    parcel: ChatParcelScope | null;
  }> {
    const [actor, conversation] = await Promise.all([
      this.loadActorScope(user, manager),
      this.em(manager)
        .getRepository(ChatConversation)
        .findOne({ where: { id: conversationId } }),
    ]);
    if (!conversation) throw chatErrors.conversationNotFound();
    const parcel = await this.loadParcelScope(conversation.parcelId, manager);
    const allowed = permissions.every((p) => staffHasPermission(actor, p, conversation, parcel));
    if (!allowed) throw chatErrors.conversationNotFound();
    return { actor, conversation, parcel };
  }

  /**
   * Validates users being added to a conversation (by `actor`): each must be
   * an ACTIVE account, eligible for the conversation's scope, not the actor,
   * and — for DIRECT / GROUP / INTERNAL_SUPERVISOR — share a hub with a
   * non-admin actor. Returns the loaded scopes.
   */
  async assertCanBeAdded(
    actor: ChatActorScope,
    conversation: ChatConversationScope,
    parcel: ChatParcelScope | null,
    userIds: readonly string[],
    manager?: EntityManager,
  ): Promise<Map<string, ChatActorScope>> {
    const scopes = await this.loadScopesForUsers(userIds, manager);
    for (const userId of userIds) {
      if (userId === actor.userId) {
        throw chatErrors.participantIneligible(
          "You are already a participant of this conversation",
        );
      }
      const target = scopes.get(userId);
      if (!target || !isEligibleParticipant(target, conversation, parcel)) {
        throw chatErrors.participantIneligible();
      }
      if (CHAT_HUB_SHARING_TYPES.has(conversation.type) && !sharesHub(actor, target)) {
        throw chatErrors.participantIneligible("Participants must share a hub with you");
      }
    }
    return scopes;
  }

  /**
   * Filters conversations to those the actor is currently eligible for.
   * One parcel query for the whole batch (list endpoints; no N+1).
   */
  async filterEligible<T extends ChatConversation>(
    actor: ChatActorScope,
    conversations: readonly T[],
  ): Promise<T[]> {
    const parcels = await this.loadParcelScopes(
      conversations.map((c) => c.parcelId).filter((id): id is string => id !== null),
    );
    return conversations.filter((c) =>
      isEligibleParticipant(actor, c, c.parcelId ? (parcels.get(c.parcelId) ?? null) : null),
    );
  }
}
