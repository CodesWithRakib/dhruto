import { ParcelStatus } from "@dhruto/contracts";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  PackageCheck,
  PackageX,
  RotateCcw,
  Truck,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/**
 * Dhruto — Centralized status design.
 * ------------------------------------------------------------------
 * One definition per parcel status: translated label, semantic tone and icon.
 * Parcel lists, details, tracking timelines, dashboards and operation screens
 * all read from here so a status never renders in a different colour or word
 * on different surfaces.
 *
 * `tone` maps to semantic tokens (info / success / warning / danger / neutral),
 * never to raw Tailwind colour scales.
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusConfig {
  labelKey: string;
  tone: StatusTone;
  icon: LucideIcon;
}

export const PARCEL_STATUS_CONFIG: Record<ParcelStatus, StatusConfig> = {
  [ParcelStatus.CREATED]: { labelKey: "created", tone: "neutral", icon: CircleDashed },
  [ParcelStatus.PICKUP_REQUESTED]: {
    labelKey: "pickupRequested",
    tone: "neutral",
    icon: Clock,
  },
  [ParcelStatus.PICKUP_ASSIGNED]: {
    labelKey: "pickupAssigned",
    tone: "info",
    icon: Truck,
  },
  [ParcelStatus.PICKED_UP]: { labelKey: "pickedUp", tone: "info", icon: PackageCheck },
  [ParcelStatus.ORIGIN_HUB_RECEIVED]: {
    labelKey: "originHubReceived",
    tone: "info",
    icon: Warehouse,
  },
  [ParcelStatus.BAGGED]: { labelKey: "bagged", tone: "info", icon: PackageCheck },
  [ParcelStatus.IN_TRANSIT]: { labelKey: "inTransit", tone: "info", icon: Truck },
  [ParcelStatus.DESTINATION_HUB_RECEIVED]: {
    labelKey: "destinationHubReceived",
    tone: "info",
    icon: Warehouse,
  },
  [ParcelStatus.ASSIGNED_TO_RIDER]: {
    labelKey: "assignedToRider",
    tone: "info",
    icon: Truck,
  },
  [ParcelStatus.OUT_FOR_DELIVERY]: {
    labelKey: "outForDelivery",
    tone: "info",
    icon: Truck,
  },
  [ParcelStatus.DELIVERY_ATTEMPTED]: {
    labelKey: "deliveryAttempted",
    tone: "warning",
    icon: AlertTriangle,
  },
  [ParcelStatus.RESCHEDULED]: {
    labelKey: "rescheduled",
    tone: "warning",
    icon: RotateCcw,
  },
  [ParcelStatus.DELIVERED]: {
    labelKey: "delivered",
    tone: "success",
    icon: CheckCircle2,
  },
  [ParcelStatus.CASH_PENDING]: {
    labelKey: "cashPending",
    tone: "warning",
    icon: Wallet,
  },
  [ParcelStatus.CASH_VERIFIED]: {
    labelKey: "cashVerified",
    tone: "success",
    icon: BadgeCheck,
  },
  [ParcelStatus.RTO_INITIATED]: {
    labelKey: "rtoInitiated",
    tone: "danger",
    icon: RotateCcw,
  },
  [ParcelStatus.RETURN_IN_TRANSIT]: {
    labelKey: "returnInTransit",
    tone: "danger",
    icon: RotateCcw,
  },
  [ParcelStatus.RETURNED_TO_MERCHANT]: {
    labelKey: "returnedToMerchant",
    tone: "danger",
    icon: PackageX,
  },
  [ParcelStatus.CANCELLED]: { labelKey: "cancelled", tone: "danger", icon: Ban },
  [ParcelStatus.LOST]: { labelKey: "lost", tone: "danger", icon: PackageX },
  [ParcelStatus.DAMAGED]: { labelKey: "damaged", tone: "danger", icon: AlertTriangle },
};

/** Semantic tone -> token class names. Keeps colour usage in one place. */
export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};

export function statusConfig(status: ParcelStatus): StatusConfig {
  return (
    PARCEL_STATUS_CONFIG[status] ?? {
      labelKey: "unknown",
      tone: "neutral",
      icon: CircleDashed,
    }
  );
}
