import { ChatConversationType, type ChatPermission } from "@dhruto/contracts";
import { UserRole } from "../../database/entities/User.entity.js";
import { roleHasChatPermission } from "../../common/permissions/chat-permissions.js";

/**
 * Pure chat authorization policy (no I/O). The authorization service loads
 * the facts below from the database — never from the request — and asks
 * these functions for a decision.
 *
 * Access to a conversation = ACTIVE membership AND live eligibility.
 * Eligibility is re-evaluated on every request, so a membership row alone is
 * never sufficient: a rider reassigned away from a parcel, a merchant whose
 * id does not match, or a hub manager unassigned from a hub loses access
 * immediately even if their participant row still says ACTIVE.
 */

/** Facts about the acting (or target) user, loaded server-side. */
export interface ChatActorScope {
  userId: string;
  role: UserRole;
  phone: string;
  /** Merchant owned by this user (MERCHANT role only). */
  merchantId: string | null;
  /** Rider profile of this user (RIDER role only). */
  riderId: string | null;
  riderHubId: string | null;
  /** Hubs with an ACTIVE HubUserAssignment (HUB_MANAGER role only). */
  managedHubIds: readonly string[];
}

export interface ChatConversationScope {
  type: ChatConversationType;
  parcelId: string | null;
  hubId: string | null;
  merchantId: string | null;
  createdByUserId: string | null;
}

export interface ChatParcelScope {
  id: string;
  merchantId: string;
  currentRiderId: string | null;
  currentHubId: string | null;
  recipientPhone: string;
}

const ALL_ROLES: readonly UserRole[] = Object.values(UserRole);
const INTERNAL_ROLES: readonly UserRole[] = [UserRole.ADMIN, UserRole.HUB_MANAGER, UserRole.RIDER];

/** Platform roles that may ever be a participant of each conversation type. */
export const CHAT_TYPE_PARTICIPANT_ROLES: Readonly<
  Record<ChatConversationType, readonly UserRole[]>
> = {
  [ChatConversationType.PARCEL_DELIVERY]: ALL_ROLES,
  [ChatConversationType.SUPPORT_TICKET]: ALL_ROLES,
  [ChatConversationType.HUB_OPERATIONS]: [UserRole.ADMIN, UserRole.HUB_MANAGER, UserRole.RIDER],
  [ChatConversationType.MERCHANT_DESK]: [UserRole.ADMIN, UserRole.MERCHANT],
  [ChatConversationType.INTERNAL_SUPERVISOR]: [UserRole.ADMIN, UserRole.HUB_MANAGER],
  // Merchants and customers talk through scoped conversation types only, so
  // they can never cold-message arbitrary users by id.
  [ChatConversationType.DIRECT]: INTERNAL_ROLES,
  [ChatConversationType.GROUP]: INTERNAL_ROLES,
};

/** Platform roles that may create each conversation type. */
export const CHAT_TYPE_CREATOR_ROLES: Readonly<Record<ChatConversationType, readonly UserRole[]>> =
  {
    [ChatConversationType.PARCEL_DELIVERY]: ALL_ROLES,
    [ChatConversationType.SUPPORT_TICKET]: ALL_ROLES,
    [ChatConversationType.HUB_OPERATIONS]: [UserRole.ADMIN, UserRole.HUB_MANAGER],
    [ChatConversationType.MERCHANT_DESK]: [UserRole.ADMIN, UserRole.MERCHANT],
    [ChatConversationType.INTERNAL_SUPERVISOR]: [UserRole.ADMIN, UserRole.HUB_MANAGER],
    [ChatConversationType.DIRECT]: INTERNAL_ROLES,
    [ChatConversationType.GROUP]: INTERNAL_ROLES,
  };

/** Types whose non-admin members must share a hub with the person adding them. */
export const CHAT_HUB_SHARING_TYPES: ReadonlySet<ChatConversationType> = new Set([
  ChatConversationType.DIRECT,
  ChatConversationType.GROUP,
  ChatConversationType.INTERNAL_SUPERVISOR,
]);

/**
 * Recipient-customer identity (Phase 5): the same rule the parcel module uses
 * for customer parcel access (`parcels.recipient_phone = users.phone`, exact).
 * Customer accounts are provisioned server-side (public registration is
 * merchant-only), and `users.phone` is unique on its raw value, so exact
 * equality is the only comparison that maps one parcel to one account —
 * format-tolerant matching could admit two accounts ("01…" and "+8801…").
 * Chat access is therefore never broader than parcel-details access.
 */
export function isParcelRecipient(actor: ChatActorScope, parcel: ChatParcelScope): boolean {
  return actor.role === UserRole.CUSTOMER && actor.phone === parcel.recipientPhone;
}

/** Hubs an internal user operates in (assignments for managers, home hub for riders). */
export function hubsOf(actor: ChatActorScope): string[] {
  if (actor.role === UserRole.HUB_MANAGER) return [...actor.managedHubIds];
  if (actor.role === UserRole.RIDER && actor.riderHubId) return [actor.riderHubId];
  return [];
}

/** True when either side is ADMIN or the two users operate in a common hub. */
export function sharesHub(a: ChatActorScope, b: ChatActorScope): boolean {
  if (a.role === UserRole.ADMIN || b.role === UserRole.ADMIN) return true;
  const hubs = new Set(hubsOf(a));
  return hubsOf(b).some((hub) => hubs.has(hub));
}

/** The hub that scopes a conversation for hub-level staff, if any. */
export function conversationHubId(
  conversation: ChatConversationScope,
  parcel: ChatParcelScope | null,
): string | null {
  return conversation.hubId ?? parcel?.currentHubId ?? null;
}

/**
 * Is `actor` eligible to be an (active) participant of `conversation`?
 * `parcel` must be supplied whenever `conversation.parcelId` is set.
 */
export function isEligibleParticipant(
  actor: ChatActorScope,
  conversation: ChatConversationScope,
  parcel: ChatParcelScope | null,
): boolean {
  if (!CHAT_TYPE_PARTICIPANT_ROLES[conversation.type].includes(actor.role)) return false;
  if (conversation.parcelId && (!parcel || parcel.id !== conversation.parcelId)) return false;

  const isCreator = conversation.createdByUserId === actor.userId;
  const isSupportTicket = conversation.type === ChatConversationType.SUPPORT_TICKET;

  switch (actor.role) {
    case UserRole.ADMIN:
      return true;

    case UserRole.MERCHANT:
      // Merchants only ever see their own merchant's conversations.
      return actor.merchantId !== null && conversation.merchantId === actor.merchantId;

    case UserRole.CUSTOMER:
      if (parcel) return isParcelRecipient(actor, parcel);
      return isSupportTicket && isCreator;

    case UserRole.RIDER:
      if (parcel) return actor.riderId !== null && parcel.currentRiderId === actor.riderId;
      if (conversation.hubId) return actor.riderHubId === conversation.hubId;
      if (isSupportTicket) return isCreator;
      return true; // DIRECT / GROUP: membership-gated, hub sharing checked when added.

    case UserRole.HUB_MANAGER: {
      const hubId = conversationHubId(conversation, parcel);
      if (hubId) return actor.managedHubIds.includes(hubId);
      if (conversation.parcelId) return false; // parcel not currently at any hub
      if (isSupportTicket) return isCreator;
      return true; // INTERNAL_SUPERVISOR / DIRECT / GROUP: membership-gated.
    }

    default:
      return false;
  }
}

/**
 * Staff (non-participant) permission check: the role ceiling plus scope.
 * ADMIN holds platform-wide scope; HUB_MANAGER only for conversations scoped
 * to a hub they are actively assigned to. Never a substitute for auditing.
 */
export function staffHasPermission(
  actor: ChatActorScope,
  permission: ChatPermission,
  conversation: ChatConversationScope,
  parcel: ChatParcelScope | null,
): boolean {
  if (!roleHasChatPermission(actor.role, permission)) return false;
  if (actor.role === UserRole.ADMIN) return true;
  if (actor.role === UserRole.HUB_MANAGER) {
    const hubId = conversationHubId(conversation, parcel);
    return hubId !== null && actor.managedHubIds.includes(hubId);
  }
  return false;
}
