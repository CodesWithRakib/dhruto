import { type EntityManager } from "typeorm";
import { ChatParticipantRole, ChatParticipantStatus } from "@dhruto/contracts";
import { ChatParticipant } from "../../database/entities/index.js";
import { chatErrors } from "../chat.errors.js";

export interface NewParticipant {
  userId: string;
  role: ChatParticipantRole;
}

export type MembershipOutcome = "inserted" | "reactivated" | "unchanged";

/**
 * Low-level membership writes shared by conversation creation, participant
 * management and staff intervention. Callers must already have authorized
 * the change and hold the conversation row lock where ordering matters.
 */

/** Inserts memberships, ignoring rows that already exist (unique (conversation, user)). */
export async function insertParticipants(
  manager: EntityManager,
  conversationId: string,
  participants: readonly NewParticipant[],
): Promise<void> {
  if (participants.length === 0) return;
  await manager
    .createQueryBuilder()
    .insert()
    .into(ChatParticipant)
    .values(participants.map((p) => ({ conversationId, userId: p.userId, role: p.role })))
    .orIgnore()
    .execute();
}

/**
 * Ensures `userId` is an ACTIVE member. A user who LEFT voluntarily is
 * reactivated; a user REMOVED by a moderator is not silently re-admitted
 * unless `allowRemoved` (an authorized moderator/staff re-adding them).
 */
export async function ensureMembership(
  manager: EntityManager,
  conversationId: string,
  participant: NewParticipant,
  options: { allowRemoved: boolean },
): Promise<MembershipOutcome> {
  const repo = manager.getRepository(ChatParticipant);
  const existing = await repo.findOne({
    where: { conversationId, userId: participant.userId },
    lock: { mode: "pessimistic_write" },
  });
  if (!existing) {
    await insertParticipants(manager, conversationId, [participant]);
    return "inserted";
  }
  if (existing.status === ChatParticipantStatus.ACTIVE) return "unchanged";
  if (existing.status === ChatParticipantStatus.REMOVED && !options.allowRemoved) {
    throw chatErrors.forbidden("You were removed from this conversation by a moderator");
  }
  await repo.update(
    { id: existing.id },
    { status: ChatParticipantStatus.ACTIVE, leftAt: null, role: participant.role },
  );
  return "reactivated";
}
