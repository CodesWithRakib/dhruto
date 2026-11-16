import {
  Bike,
  Calculator,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Package,
  PackageSearch,
  ScanLine,
  Search,
  Settings,
  User,
  Warehouse,
  Wallet,
  BarChart3,
  Truck,
  RotateCcw,
  AlertTriangle,
  Radio,
  BrainCircuit,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_ROUTES, CUSTOMER_ROUTES, HUB_ROUTES, MERCHANT_ROUTES, PUBLIC_ROUTES, RIDER_ROUTES } from "./routes";
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
  /** Live indicator rendered next to the label (Phase 5: global chat unread). */
  indicator?: "chat-unread";
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
      labelKey: "groupOperations",
      items: [
        {
          href: MERCHANT_ROUTES.dashboard,
          labelKey: "overview",
          icon: LayoutDashboard,
        },
        {
          href: MERCHANT_ROUTES.parcels,
          labelKey: "shipments",
          icon: Package,
        },
        {
          href: MERCHANT_ROUTES.returns,
          labelKey: "returns",
          icon: RotateCcw,
        },
        {
          href: MERCHANT_ROUTES.messages,
          labelKey: "messages",
          icon: MessagesSquare,
          indicator: "chat-unread",
        },
      ],
    },
    {
      labelKey: "groupFinance",
      items: [
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
      ],
    },
    {
      labelKey: "groupTools",
      items: [
        {
          href: MERCHANT_ROUTES.calculator,
          labelKey: "calculator",
          icon: Calculator,
        },
        {
          href: MERCHANT_ROUTES.webhooks,
          labelKey: "integrations",
          icon: Radio,
        },
        {
          href: MERCHANT_ROUTES.settings,
          labelKey: "settings",
          icon: Settings,
        },
      ],
    },
  ],
  ADMIN: [
    {
      labelKey: "groupOverview",
      items: [{ href: ADMIN_ROUTES.dashboard, labelKey: "overview", icon: LayoutDashboard }],
    },
    {
      labelKey: "groupOperations",
      items: [
        { href: ADMIN_ROUTES.parcels, labelKey: "parcels", icon: Package },
        { href: ADMIN_ROUTES.hub, labelKey: "hub", icon: Warehouse },
        { href: ADMIN_ROUTES.rider, labelKey: "rider", icon: Bike },
        { href: ADMIN_ROUTES.messages, labelKey: "messages", icon: MessagesSquare, indicator: "chat-unread" },
      ],
    },
    {
      labelKey: "groupFinance",
      items: [
        { href: ADMIN_ROUTES.finance, labelKey: "finance", icon: Wallet },
      ],
    },
    {
      labelKey: "groupIntelligence",
      items: [
        { href: ADMIN_ROUTES.analytics, labelKey: "analytics", icon: BarChart3 },
        { href: ADMIN_ROUTES.intelligence, labelKey: "intelligence", icon: BrainCircuit },
        { href: ADMIN_ROUTES.integrations, labelKey: "integrations", icon: Radio },
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
        { href: HUB_ROUTES.messages, labelKey: "messages", icon: MessagesSquare, indicator: "chat-unread" },
      ],
    },
    {
      labelKey: "groupDispatch",
      items: [
        { href: HUB_ROUTES.bags, labelKey: "bags", icon: Package },
        { href: HUB_ROUTES.manifests, labelKey: "manifests", icon: Truck },
      ],
    },
    {
      labelKey: "groupAudit",
      items: [
        { href: HUB_ROUTES.exceptions, labelKey: "exceptions", icon: AlertTriangle },
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
      labelKey: "groupActiveShift",
      items: [
        { href: RIDER_ROUTES.dashboard, labelKey: "overview", icon: LayoutDashboard },
        { href: RIDER_ROUTES.tasks, labelKey: "tasks", icon: ClipboardList },
        { href: RIDER_ROUTES.messages, labelKey: "messages", icon: MessagesSquare, indicator: "chat-unread" },
      ],
    },
    {
      labelKey: "groupPerformance",
      items: [
        { href: RIDER_ROUTES.history, labelKey: "history", icon: History },
      ],
    },
    {
      labelKey: "groupAccount",
      items: [
        { href: RIDER_ROUTES.profile, labelKey: "profile", icon: User },
        { href: RIDER_ROUTES.settings, labelKey: "settings", icon: Settings },
      ],
    },
    {
      labelKey: "groupNetwork",
      items: [TRACKING_ITEM],
    },
  ],
  CUSTOMER: [
    {
      labelKey: "groupOverview",
      items: [
        {
          href: CUSTOMER_ROUTES.dashboard,
          labelKey: "customerDashboard",
          icon: LayoutDashboard,
        },
        {
          href: CUSTOMER_ROUTES.tracking,
          labelKey: "customerTracking",
          icon: Search,
        },
        {
          href: CUSTOMER_ROUTES.history,
          labelKey: "customerHistory",
          icon: History,
        },
        {
          href: CUSTOMER_ROUTES.messages,
          labelKey: "messages",
          icon: MessagesSquare,
          indicator: "chat-unread",
        },
      ],
    },
    {
      labelKey: "groupTools",
      items: [
        {
          href: CUSTOMER_ROUTES.settings,
          labelKey: "customerSettings",
          icon: Settings,
        },
      ],
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
    MERCHANT_ROUTES.finance,
    MERCHANT_ROUTES.settings,
  ],
  ADMIN: [ADMIN_ROUTES.dashboard, ADMIN_ROUTES.parcels, ADMIN_ROUTES.finance, ADMIN_ROUTES.hub],
  HUB_MANAGER: [HUB_ROUTES.dashboard, HUB_ROUTES.scanner, HUB_ROUTES.bags, HUB_ROUTES.manifests],
  RIDER: [RIDER_ROUTES.dashboard, RIDER_ROUTES.tasks, RIDER_ROUTES.history, RIDER_ROUTES.profile],
  CUSTOMER: [
    CUSTOMER_ROUTES.dashboard,
    CUSTOMER_ROUTES.tracking,
    CUSTOMER_ROUTES.history,
    CUSTOMER_ROUTES.settings,
  ],
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
