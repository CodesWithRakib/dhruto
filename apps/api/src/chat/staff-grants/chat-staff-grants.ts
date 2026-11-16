import { IsNull, type DataSource } from "typeorm";
import {
  CHAT_GRANT_REQUIRED_PERMISSIONS,
  ChatAuditAction,
  type ChatPermission,
} from "@dhruto/contracts";
import {
  ChatAuditLog,
  ChatStaffGrant,
  User,
  UserRole,
  UserStatus,
} from "../../database/entities/index.js";
import { roleHasChatPermission } from "../../common/permissions/chat-permissions.js";

/**
 * Operator-side management of grant-required chat permissions (Phase 7).
 * Deliberately NOT exposed over HTTP: only someone with operational access
 * to the API environment (database credentials) can grant, so an admin can
 * never escalate their own chat privileges through the application. Every
 * change writes a STAFF_GRANT_CHANGED audit row in the same transaction.
 */

export interface GrantChange {
  /** User id or email of the staff member. */
  user: string;
  permission: string;
  reason: string;
  /** Who performed the change (operator label, e.g. a ticket or name; no secrets). */
  operator: string;
  expiresAt?: Date | null;
}

export type GrantOutcome = "granted" | "revoked" | "unchanged";

export class StaffGrantError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePermission(value: string): ChatPermission {
  const permission = CHAT_GRANT_REQUIRED_PERMISSIONS.find((p) => p === value);
  if (!permission) {
    throw new StaffGrantError(
      `Permission must be one of: ${CHAT_GRANT_REQUIRED_PERMISSIONS.join(", ")}`,
    );
  }
  return permission;
}

function validateText(label: string, value: string, min: number, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new StaffGrantError(`${label} must be ${min}-${max} characters`);
  }
  return trimmed;
}

async function resolveUser(ds: DataSource, ref: string): Promise<User> {
  const qb = ds.getRepository(User).createQueryBuilder("u").select(["u.id", "u.role", "u.status"]);
  const user = UUID_RE.test(ref)
    ? await qb.where("u.id = :id", { id: ref }).getOne()
    : await qb.where("LOWER(u.email) = LOWER(:email)", { email: ref.trim() }).getOne();
  if (!user) throw new StaffGrantError("User not found");
  return user;
}

export async function grantStaffPermission(
  ds: DataSource,
  change: GrantChange,
): Promise<GrantOutcome> {
  const permission = parsePermission(change.permission);
  const reason = validateText("Reason", change.reason, 10, 500);
  const operator = validateText("Operator", change.operator, 1, 120);
  if (change.expiresAt && change.expiresAt.getTime() <= Date.now()) {
    throw new StaffGrantError("Expiry must be in the future");
  }
  const user = await resolveUser(ds, change.user);
  if (user.status !== UserStatus.ACTIVE) throw new StaffGrantError("User is not active");
  if (user.role !== UserRole.ADMIN || !roleHasChatPermission(user.role, permission)) {
    throw new StaffGrantError("Only ADMIN accounts can hold this permission");
  }
  return ds.transaction(async (manager) => {
    const repo = manager.getRepository(ChatStaffGrant);
    const existing = await repo.findOne({
      where: { userId: user.id, permission, revokedAt: IsNull() },
      lock: { mode: "pessimistic_write" },
    });
    if (existing) return "unchanged";
    const grant = await repo.save(
      repo.create({
        userId: user.id,
        permission,
        reason,
        grantedBy: operator,
        expiresAt: change.expiresAt ?? null,
      }),
    );
    await manager.getRepository(ChatAuditLog).save(
      manager.getRepository(ChatAuditLog).create({
        action: ChatAuditAction.STAFF_GRANT_CHANGED,
        actorUserId: null,
        actorRole: null,
        targetType: "staff_grant",
        targetId: grant.id,
        reason,
        metadata: {
          change: "granted",
          userId: user.id,
          permission,
          operator,
          expiresAt: grant.expiresAt?.toISOString() ?? null,
        },
      }),
    );
    return "granted";
  });
}

export async function revokeStaffPermission(
  ds: DataSource,
  change: GrantChange,
): Promise<GrantOutcome> {
  const permission = parsePermission(change.permission);
  const reason = validateText("Reason", change.reason, 10, 500);
  const operator = validateText("Operator", change.operator, 1, 120);
  const user = await resolveUser(ds, change.user);
  return ds.transaction(async (manager) => {
    const repo = manager.getRepository(ChatStaffGrant);
    const existing = await repo.findOne({
      where: { userId: user.id, permission, revokedAt: IsNull() },
      lock: { mode: "pessimistic_write" },
    });
    if (!existing) return "unchanged";
    await repo.update(
      { id: existing.id },
      { revokedAt: new Date(), revokedBy: operator, revokeReason: reason },
    );
    await manager.getRepository(ChatAuditLog).save(
      manager.getRepository(ChatAuditLog).create({
        action: ChatAuditAction.STAFF_GRANT_CHANGED,
        actorUserId: null,
        actorRole: null,
        targetType: "staff_grant",
        targetId: existing.id,
        reason,
        metadata: { change: "revoked", userId: user.id, permission, operator },
      }),
    );
    return "revoked";
  });
}

export async function listStaffGrants(
  ds: DataSource,
  userRef?: string,
): Promise<
  Array<
    Pick<ChatStaffGrant, "id" | "userId" | "permission" | "expiresAt" | "revokedAt" | "createdAt">
  >
> {
  const where = userRef ? { userId: (await resolveUser(ds, userRef)).id } : {};
  return ds.getRepository(ChatStaffGrant).find({
    where,
    order: { createdAt: "DESC" },
    take: 200,
    select: ["id", "userId", "permission", "expiresAt", "revokedAt", "createdAt"],
  });
}
