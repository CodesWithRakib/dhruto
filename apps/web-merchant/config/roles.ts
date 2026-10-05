import {
  ADMIN_ROUTES,
  HUB_ROUTES,
  MERCHANT_ROUTES,
  PUBLIC_ROUTES,
  RIDER_ROUTES,
} from "./routes";

/**
 * Dhruto — Centralized role configuration.
 * ------------------------------------------------------------------
 * Mirrors the backend `UserRole` enum. Frontend role checks must read from
 * here (or from the navigation config) rather than comparing raw role strings
 * inside components.
 *
 * Frontend RBAC is a UX / information-architecture layer only. Backend
 * authorization remains the authoritative boundary.
 */
export type AppRole = "ADMIN" | "MERCHANT" | "HUB_MANAGER" | "RIDER" | "CUSTOMER";

export const ALL_ROLES: AppRole[] = [
  "ADMIN",
  "MERCHANT",
  "HUB_MANAGER",
  "RIDER",
  "CUSTOMER",
];

/** A top-level surface of the application, matching the route groups. */
export type AppSection = "public" | "auth" | "merchant" | "admin" | "hub" | "rider";

export interface RoleConfig {
  role: AppRole;
  /** Key relative to the `Nav` namespace. */
  labelKey: string;
  /** User's primary application surface. */
  section: AppSection;
  /** Where the role lands after sign-in. */
  home: string;
  /** Sections this role is allowed to open. */
  sections: AppSection[];
}

export const ROLE_CONFIG: Record<AppRole, RoleConfig> = {
  ADMIN: {
    role: "ADMIN",
    labelKey: "roleAdmin",
    section: "admin",
    home: ADMIN_ROUTES.dashboard,
    sections: ["public", "admin", "merchant", "hub", "rider"],
  },
  MERCHANT: {
    role: "MERCHANT",
    labelKey: "roleMerchant",
    section: "merchant",
    home: MERCHANT_ROUTES.dashboard,
    sections: ["public", "merchant"],
  },
  HUB_MANAGER: {
    role: "HUB_MANAGER",
    labelKey: "roleHubManager",
    section: "hub",
    home: HUB_ROUTES.dashboard,
    sections: ["public", "hub"],
  },
  RIDER: {
    role: "RIDER",
    labelKey: "roleRider",
    section: "rider",
    home: RIDER_ROUTES.dashboard,
    sections: ["public", "rider"],
  },
  CUSTOMER: {
    role: "CUSTOMER",
    labelKey: "roleCustomer",
    section: "public",
    home: PUBLIC_ROUTES.tracking,
    sections: ["public"],
  },
};

/** Safely narrows an arbitrary string from the API/session into a known role. */
export function asAppRole(role: string | undefined | null): AppRole {
  return ALL_ROLES.includes(role as AppRole) ? (role as AppRole) : "MERCHANT";
}

export function roleConfigFor(role: string | undefined | null): RoleConfig {
  return ROLE_CONFIG[asAppRole(role)];
}

export interface RoleHome {
  href: string;
}

/** Where a given role lands after signing in (and from the public CTA). */
export function homeForRole(role: string | undefined | null): RoleHome {
  return { href: roleConfigFor(role).home };
}

/** True when `role` is permitted to open `section`. */
export function canAccessSection(
  role: string | undefined | null,
  section: AppSection,
): boolean {
  return roleConfigFor(role).sections.includes(section);
}
