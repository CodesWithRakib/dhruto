import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Wallet,
  Sparkles,
  Warehouse,
  Bike,
  Webhook,
  Search,
  type LucideIcon,
} from "lucide-react";

/** Mirrors `UserRole` on the API. Kept local because the frontend must not import entities. */
export type AppRole = "ADMIN" | "MERCHANT" | "HUB_MANAGER" | "RIDER" | "CUSTOMER";

export const ALL_ROLES: AppRole[] = [
  "ADMIN",
  "MERCHANT",
  "HUB_MANAGER",
  "RIDER",
  "CUSTOMER",
];

export interface NavItem {
  /** Locale-relative path — the i18n `Link` prefixes the active locale. */
  href: string;
  /** Key relative to the `Nav` namespace, e.g. `overview`. */
  labelKey: string;
  icon: LucideIcon;
  roles: AppRole[];
}

export interface NavGroup {
  /** Optional group heading key, relative to the `Nav` namespace. */
  labelKey?: string;
  items: NavItem[];
}

/**
 * Single source of truth for dashboard navigation.
 *
 * Add an item once here — it automatically appears in the desktop sidebar,
 * the mobile drawer and the mobile bottom nav for exactly the roles allowed,
 * instead of scattering `role === "..."` checks through components.
 */
export const DASHBOARD_NAV: NavGroup[] = [
  {
    labelKey: "groupOverview",
    items: [
      {
        href: "/dashboard",
        labelKey: "overview",
        icon: LayoutDashboard,
        roles: ["MERCHANT", "ADMIN"],
      },
    ],
  },
  {
    labelKey: "groupShipments",
    items: [
      {
        href: "/bookings/new",
        labelKey: "createBooking",
        icon: PlusCircle,
        roles: ["MERCHANT", "ADMIN"],
      },
      {
        href: "/parcels",
        labelKey: "parcels",
        icon: Package,
        roles: ["MERCHANT", "ADMIN"],
      },
      {
        href: "/track",
        labelKey: "tracking",
        icon: Search,
        roles: ["MERCHANT", "ADMIN", "HUB_MANAGER", "RIDER"],
      },
    ],
  },
  {
    labelKey: "groupFinance",
    items: [
      {
        href: "/finance",
        labelKey: "finance",
        icon: Wallet,
        roles: ["MERCHANT", "ADMIN"],
      },
    ],
  },
  {
    labelKey: "groupOperations",
    items: [
      {
        href: "/hub",
        labelKey: "hub",
        icon: Warehouse,
        roles: ["HUB_MANAGER", "ADMIN"],
      },
      {
        href: "/rider",
        labelKey: "rider",
        icon: Bike,
        roles: ["RIDER", "ADMIN"],
      },
      {
        href: "/intelligence",
        labelKey: "intelligence",
        icon: Sparkles,
        roles: ["MERCHANT", "ADMIN"],
      },
    ],
  },
  {
    labelKey: "groupDeveloper",
    items: [
      {
        href: "/developer/webhooks",
        labelKey: "webhooks",
        icon: Webhook,
        roles: ["MERCHANT", "ADMIN"],
      },
    ],
  },
];

/** Roles that get a mobile bottom navigation bar (task-oriented surfaces). */
export const BOTTOM_NAV_ROLES: AppRole[] = [
  "MERCHANT",
  "RIDER",
  "HUB_MANAGER",
  "ADMIN",
];

/**
 * Up to four items shown in the mobile bottom bar for each role.
 * Ordered by importance for one-handed use.
 */
const BOTTOM_NAV_HREFS: Record<AppRole, string[]> = {
  MERCHANT: ["/dashboard", "/parcels", "/bookings/new", "/finance"],
  RIDER: ["/rider", "/track", "/parcels"],
  HUB_MANAGER: ["/hub", "/track", "/parcels"],
  ADMIN: ["/dashboard", "/hub", "/rider", "/finance"],
  CUSTOMER: ["/track"],
};

function flatten(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items);
}

/** Navigation visible to a given role (ADMIN sees everything). */
export function navForRole(role: AppRole | undefined): NavGroup[] {
  const effective: AppRole = role ?? "MERCHANT";

  return DASHBOARD_NAV.map((group) => ({
    labelKey: group.labelKey,
    items: group.items.filter(
      (item) => item.roles.includes(effective) || effective === "ADMIN",
    ),
  })).filter((group) => group.items.length > 0);
}

/** Bottom-bar items for a role, resolved from the flattened config. */
export function bottomNavForRole(role: AppRole | undefined): NavItem[] {
  const effective: AppRole = role ?? "MERCHANT";
  const hrefs = BOTTOM_NAV_HREFS[effective] ?? BOTTOM_NAV_HREFS.MERCHANT;
  const all = flatten(DASHBOARD_NAV);

  return hrefs
    .map((href) => all.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
}

/** True when `pathname` is the item's route or a nested route of it. */
export function isActiveRoute(pathname: string, href: string): boolean {
  const clean = pathname.replace(/^\/(en|bn)/, "") || "/";
  if (href === "/dashboard") return clean === "/dashboard";
  return clean === href || clean.startsWith(`${href}/`);
}
