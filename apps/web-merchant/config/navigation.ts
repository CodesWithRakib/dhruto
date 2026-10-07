import {
  Bike,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Package,
  PackageSearch,
  PlusCircle,
  ScanLine,
  Search,
  Settings,
  UploadCloud,
  User,
  Warehouse,
  Wallet,
  BarChart3,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_ROUTES, HUB_ROUTES, MERCHANT_ROUTES, PUBLIC_ROUTES, RIDER_ROUTES } from "./routes";
import type { AppRole } from "./roles";

/**
 * Dhruto — Centralized navigation configuration.
 * ------------------------------------------------------------------
 * Navigation is declared per role, not filtered from one global list with
 * scattered `role === "..."` checks. A role's route group, its sidebar, its
 * mobile drawer and its bottom bar all read from here.
 */
export interface NavItem {
  /** Locale-relative href — the i18n `Link` prefixes the active locale. */
  href: string;
  /** Key relative to the `Nav` namespace. */
  labelKey: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Optional group heading key, relative to the `Nav` namespace. */
  labelKey?: string;
  items: NavItem[];
}

const TRACKING_ITEM: NavItem = {
  href: PUBLIC_ROUTES.tracking,
  labelKey: "tracking",
  icon: Search,
};

/** Secondary navigation for each role (desktop sidebar + mobile drawer). */
export const NAV_BY_ROLE: Record<AppRole, NavGroup[]> = {
  MERCHANT: [
    {
      items: [
        {
          href: MERCHANT_ROUTES.dashboard,
          labelKey: "overview",
          icon: LayoutDashboard,
        },
        {
          href: MERCHANT_ROUTES.createBooking,
          labelKey: "createBooking",
          icon: PlusCircle,
        },
        {
          href: `${MERCHANT_ROUTES.createBooking}?mode=bulk`,
          labelKey: "bulkUpload",
          icon: UploadCloud,
        },
        {
          href: MERCHANT_ROUTES.parcels,
          labelKey: "shipments",
          icon: Package,
        },
        {
          href: MERCHANT_ROUTES.finance,
          labelKey: "financials",
          icon: Wallet,
        },
        {
          href: MERCHANT_ROUTES.analytics,
          labelKey: "analytics",
          icon: BarChart3,
        },
        {
          href: MERCHANT_ROUTES.intelligence,
          labelKey: "reports",
          icon: FileText,
        },
        {
          href: MERCHANT_ROUTES.tracking,
          labelKey: "tracking",
          icon: Search,
        },
        {
          href: MERCHANT_ROUTES.webhooks,
          labelKey: "settings",
          icon: Settings,
        },
      ],
    },
  ],
  ADMIN: [
    {
      labelKey: "groupOverview",
      items: [
        { href: ADMIN_ROUTES.dashboard, labelKey: "overview", icon: LayoutDashboard },
      ],
    },
    {
      labelKey: "groupOperations",
      items: [
        { href: ADMIN_ROUTES.parcels, labelKey: "parcels", icon: Package },
        { href: ADMIN_ROUTES.hub, labelKey: "hub", icon: Warehouse },
        { href: ADMIN_ROUTES.rider, labelKey: "rider", icon: Bike },
      ],
    },
    {
      labelKey: "groupFinance",
      items: [
        { href: ADMIN_ROUTES.finance, labelKey: "finance", icon: Wallet },
        { href: ADMIN_ROUTES.analytics, labelKey: "analytics", icon: BarChart3 },
      ],
    },
    {
      labelKey: "groupAnalytics",
      items: [
        { href: `${ADMIN_ROUTES.analytics}/parcels`, labelKey: "parcels", icon: PackageSearch },
        { href: `${ADMIN_ROUTES.analytics}/rto`, labelKey: "rto", icon: History },
        { href: `${ADMIN_ROUTES.analytics}/cod`, labelKey: "financials", icon: Wallet },
        { href: `${ADMIN_ROUTES.analytics}/alerts`, labelKey: "alerts", icon: ClipboardList },
        { href: `${ADMIN_ROUTES.analytics}/reports`, labelKey: "reports", icon: FileText },
      ],
    },
    {
      labelKey: "groupNetwork",
      items: [
        {
          href: ADMIN_ROUTES.tracking,
          labelKey: "tracking",
          icon: Search,
        },
      ],
    },
  ],
  HUB_MANAGER: [
    {
      labelKey: "groupOperations",
      items: [
        { href: HUB_ROUTES.dashboard, labelKey: "overview", icon: LayoutDashboard },
        { href: HUB_ROUTES.scanner, labelKey: "scanner", icon: ScanLine },
        { href: HUB_ROUTES.parcels, labelKey: "parcels", icon: PackageSearch },
        { href: HUB_ROUTES.bags, labelKey: "bags", icon: Package },
        { href: HUB_ROUTES.manifests, labelKey: "manifests", icon: Truck },
        { href: HUB_ROUTES.cash, labelKey: "cash", icon: Wallet },
      ],
    },
    {
      labelKey: "groupNetwork",
      items: [TRACKING_ITEM],
    },
  ],
  RIDER: [
    {
      labelKey: "groupOverview",
      items: [
        { href: RIDER_ROUTES.dashboard, labelKey: "overview", icon: LayoutDashboard },
        { href: RIDER_ROUTES.tasks, labelKey: "tasks", icon: ClipboardList },
        { href: RIDER_ROUTES.history, labelKey: "history", icon: History },
        { href: RIDER_ROUTES.profile, labelKey: "profile", icon: User },
      ],
    },
    {
      labelKey: "groupNetwork",
      items: [TRACKING_ITEM],
    },
  ],
  CUSTOMER: [
    {
      labelKey: "groupNetwork",
      items: [TRACKING_ITEM],
    },
  ],
};

/**
 * Primary mobile bottom-bar items per role. Empty means the role relies on the
 * hamburger drawer instead of a persistent bar (surfaces with a single route).
 */
const BOTTOM_HREFS: Record<AppRole, string[]> = {
  MERCHANT: [
    MERCHANT_ROUTES.dashboard,
    MERCHANT_ROUTES.parcels,
    MERCHANT_ROUTES.createBooking,
    MERCHANT_ROUTES.finance,
  ],
  ADMIN: [
    ADMIN_ROUTES.dashboard,
    ADMIN_ROUTES.parcels,
    ADMIN_ROUTES.finance,
    ADMIN_ROUTES.hub,
  ],
  HUB_MANAGER: [
    HUB_ROUTES.dashboard,
    HUB_ROUTES.scanner,
    HUB_ROUTES.bags,
    HUB_ROUTES.manifests,
  ],
  RIDER: [
    RIDER_ROUTES.dashboard,
    RIDER_ROUTES.tasks,
    RIDER_ROUTES.history,
    RIDER_ROUTES.profile,
  ],
  CUSTOMER: [],
};

function allItems(role: AppRole): NavItem[] {
  return NAV_BY_ROLE[role].flatMap((group) => group.items);
}

/** Sidebar / drawer navigation for a role. */
export function navForRole(role: AppRole): NavGroup[] {
  return NAV_BY_ROLE[role] ?? NAV_BY_ROLE.MERCHANT;
}

/** Bottom-bar items for a role, resolved from the role's flattened config. */
export function bottomNavForRole(role: AppRole): NavItem[] {
  const items = allItems(role);
  return BOTTOM_HREFS[role]
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
}

/** True when a role has routes beyond the bottom bar (drives the "More" tab). */
export function hasMoreForRole(role: AppRole): boolean {
  return allItems(role).length > bottomNavForRole(role).length;
}
