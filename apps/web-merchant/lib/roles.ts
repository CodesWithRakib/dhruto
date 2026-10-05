import type { AppRole } from "./nav-config";
import { ALL_ROLES } from "./nav-config";

/** Safely narrows an arbitrary string from the API/session into a known role. */
export function asAppRole(role: string | undefined | null): AppRole {
  return ALL_ROLES.includes(role as AppRole) ? (role as AppRole) : "MERCHANT";
}

export interface RoleHome {
  href: string;
  labelKey: string;
}

/** Where a given role lands after signing in (and from the public CTA). */
export function homeForRole(role: string | undefined | null): RoleHome {
  switch (asAppRole(role)) {
    case "RIDER":
      return { href: "/rider", labelKey: "rider" };
    case "HUB_MANAGER":
      return { href: "/hub", labelKey: "hub" };
    default:
      return { href: "/dashboard", labelKey: "overview" };
  }
}
