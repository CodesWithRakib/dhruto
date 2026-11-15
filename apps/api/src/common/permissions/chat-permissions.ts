import { ChatPermission } from "@dhruto/contracts";
import { UserRole } from "../../database/entities/User.entity.js";

/**
 * Platform-level chat permission ceiling (communication Phase 1 foundation).
 *
 * Mirrors the hub permission model: the platform role is the coarse ceiling;
 * conversation access is ALSO bounded by participant membership or by an
 * explicit, audited staff permission below. Unlike `RolesGuard` (where ADMIN
 * bypasses every role check), chat code must never treat ADMIN as implicit
 * access to conversation content:
 *
 *   - A participant reads/writes through membership + participant role.
 *   - A non-participant staff member may only read/intervene through
 *     CONVERSATION_VIEW_ANY / CONVERSATION_INTERVENE, and every such access
 *     must write a `chat_audit_logs` row with a non-empty reason (enforced by
 *     the `CHK_chat_audit_logs_admin_reason` constraint).
 *
 * There is no SUPERADMIN platform role today. When one is introduced (an
 * authentication change requiring explicit approval), it receives the full
 * set and ADMIN can be narrowed here without touching call sites.
 */
export const ALL_CHAT_PERMISSIONS: readonly ChatPermission[] = Object.values(ChatPermission);

export const ROLE_CHAT_PERMISSIONS: Readonly<Record<UserRole, readonly ChatPermission[]>> = {
  [UserRole.ADMIN]: ALL_CHAT_PERMISSIONS,
  // Hub managers may moderate and keep internal notes, but cannot read
  // arbitrary conversations platform-wide or the audit log. Hub-scoped
  // oversight must additionally be bounded to their assigned hubs by the
  // service layer (HubUserAssignment), never by a client-supplied hubId.
  [UserRole.HUB_MANAGER]: [
    ChatPermission.CONVERSATION_MODERATE,
    ChatPermission.MESSAGE_MODERATE,
    ChatPermission.INTERNAL_NOTE_MANAGE,
  ],
  // External / field roles act only through conversation membership.
  [UserRole.MERCHANT]: [],
  [UserRole.RIDER]: [],
  [UserRole.CUSTOMER]: [],
};

export function roleHasChatPermission(role: UserRole, permission: ChatPermission): boolean {
  return (ROLE_CHAT_PERMISSIONS[role] ?? []).includes(permission);
}
