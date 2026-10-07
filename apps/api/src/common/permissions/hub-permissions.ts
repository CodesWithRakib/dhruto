import { HubPermission } from "@dhruto/contracts";
import { UserRole } from "../../database/entities/User.entity.js";

/**
 * Centralized hub permission model.
 *
 * This extends the existing RBAC system rather than replacing it: roles are the
 * coarse gate (see `RolesGuard`), permissions are the fine-grained capability
 * inside a specific hub, and `HubUserAssignment` scopes them to a hub.
 *
 * Authorization for a hub operation is therefore the intersection of:
 *   1. the role ceiling below (can this role do hub work at all), and
 *   2. the permissions explicitly granted on the user's hub assignment.
 *
 * A client-supplied `hubId` is never proof of authorization.
 */
export const ALL_HUB_PERMISSIONS: readonly HubPermission[] = Object.values(HubPermission);

/** The role ceiling: what a role may ever do inside a hub. */
export const ROLE_HUB_PERMISSIONS: Record<UserRole, readonly HubPermission[]> = {
  [UserRole.ADMIN]: ALL_HUB_PERMISSIONS,
  [UserRole.HUB_MANAGER]: ALL_HUB_PERMISSIONS,
  // Merchants, riders and customers never hold hub operations permissions.
  [UserRole.MERCHANT]: [],
  [UserRole.RIDER]: [],
  [UserRole.CUSTOMER]: [],
};

/** Roles that may access hub operations at all. Used by `@Roles(...)`. */
export const HUB_OPERATION_ROLES: readonly UserRole[] = [UserRole.ADMIN, UserRole.HUB_MANAGER];

/** True when `role` may ever hold `permission`, ignoring hub scope. */
export function roleAllowsPermission(role: UserRole, permission: HubPermission): boolean {
  return (ROLE_HUB_PERMISSIONS[role] ?? []).includes(permission);
}

/**
 * Effective permissions for an actor: the role ceiling narrowed by the
 * permissions granted on their hub assignment.
 */
export function effectiveHubPermissions(
  role: UserRole,
  granted: readonly HubPermission[] | null | undefined,
): HubPermission[] {
  const ceiling = ROLE_HUB_PERMISSIONS[role] ?? [];
  if (!granted) return [];
  return ceiling.filter((permission) => granted.includes(permission));
}

export function hasEffectivePermission(
  role: UserRole,
  granted: readonly HubPermission[] | null | undefined,
  permission: HubPermission,
): boolean {
  return effectiveHubPermissions(role, granted).includes(permission);
}
