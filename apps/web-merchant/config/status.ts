import {
  BagStatus,
  CashDiscrepancyStatus,
  CashHandInStatus,
  ExceptionStatus,
  FinancialTransactionStatus,
  ManifestStatus,
  ParcelStatus,
  PayoutStatus,
  RiderDutyStatus,
  ScanOutcome,
  SettlementStatus,
  WalletTransactionType,
} from "@dhruto/contracts";
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
    tone: "warning",
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

/* ------------------------------------------------------------------ */
/* Non-parcel domain statuses                                          */
/* ------------------------------------------------------------------ */
/**
 * Every other status surface in Dhruto. Parcel status is richer (it also owns
 * an icon and a lifecycle), so it keeps `PARCEL_STATUS_CONFIG`; everything else
 * only maps a value to a semantic tone here. `EnumBadge` combines one of these
 * maps with a message namespace, which means a payout "COMPLETED" and a
 * settlement "SETTLED" always render with the same success tone.
 */
export const STATUS_TONE_FALLBACK: StatusTone = "neutral";

export const PAYOUT_STATUS_TONE: Record<PayoutStatus, StatusTone> = {
  [PayoutStatus.REQUESTED]: "warning",
  [PayoutStatus.APPROVED]: "info",
  [PayoutStatus.PROCESSING]: "info",
  [PayoutStatus.COMPLETED]: "success",
  [PayoutStatus.FAILED]: "danger",
  [PayoutStatus.REJECTED]: "danger",
  [PayoutStatus.CANCELLED]: "neutral",
};

export const WALLET_TRANSACTION_TONE: Record<WalletTransactionType, StatusTone> = {
  [WalletTransactionType.COD_CREDIT]: "success",
  [WalletTransactionType.DELIVERY_FEE]: "danger",
  [WalletTransactionType.RETURN_FEE]: "danger",
  [WalletTransactionType.PAYOUT_DEBIT]: "warning",
  [WalletTransactionType.ADJUSTMENT_CREDIT]: "info",
  [WalletTransactionType.ADJUSTMENT_DEBIT]: "info",
};

export const BAG_STATUS_TONE: Record<BagStatus, StatusTone> = {
  [BagStatus.OPEN]: "neutral",
  [BagStatus.SEALED]: "info",
  [BagStatus.IN_TRANSIT]: "info",
  [BagStatus.RECEIVED]: "success",
  [BagStatus.COMPLETED]: "success",
  [BagStatus.CANCELLED]: "danger",
};

export const MANIFEST_STATUS_TONE: Record<ManifestStatus, StatusTone> = {
  [ManifestStatus.CREATED]: "neutral",
  [ManifestStatus.DISPATCHED]: "info",
  [ManifestStatus.IN_TRANSIT]: "info",
  [ManifestStatus.RECEIVED]: "success",
  [ManifestStatus.RECONCILED]: "success",
  [ManifestStatus.CANCELLED]: "danger",
};

export const EXCEPTION_STATUS_TONE: Record<ExceptionStatus, StatusTone> = {
  [ExceptionStatus.OPEN]: "danger",
  [ExceptionStatus.RESOLVED]: "success",
  [ExceptionStatus.DISMISSED]: "neutral",
};

export const SETTLEMENT_STATUS_TONE: Record<SettlementStatus, StatusTone> = {
  [SettlementStatus.SETTLED]: "success",
  [SettlementStatus.REVERSED]: "danger",
};

export const CASH_HANDIN_STATUS_TONE: Record<CashHandInStatus, StatusTone> = {
  [CashHandInStatus.SUBMITTED]: "warning",
  [CashHandInStatus.VERIFIED]: "success",
  [CashHandInStatus.DISCREPANCY]: "danger",
  [CashHandInStatus.RESOLVED]: "info",
};

export const CASH_DISCREPANCY_STATUS_TONE: Record<CashDiscrepancyStatus, StatusTone> = {
  [CashDiscrepancyStatus.OPEN]: "danger",
  [CashDiscrepancyStatus.RESOLVED]: "success",
};

export const FINANCIAL_TXN_STATUS_TONE: Record<FinancialTransactionStatus, StatusTone> = {
  [FinancialTransactionStatus.POSTED]: "success",
  [FinancialTransactionStatus.REVERSED]: "danger",
};

export const RIDER_DUTY_TONE: Record<RiderDutyStatus, StatusTone> = {
  [RiderDutyStatus.ON_DUTY]: "success",
  [RiderDutyStatus.OFF_DUTY]: "neutral",
};

/**
 * Rider account status is a plain string on the wire (the API does not expose
 * an enum), so this is an open map with a neutral fallback for new values.
 */
export const RIDER_STATUS_TONE: Record<string, StatusTone> = {
  ACTIVE: "success",
  ON_DUTY: "success",
  PENDING: "warning",
  SUSPENDED: "danger",
  INACTIVE: "neutral",
  OFF_DUTY: "neutral",
};

export const SCAN_OUTCOME_TONE: Record<ScanOutcome, StatusTone> = {
  [ScanOutcome.APPLIED]: "success",
  [ScanOutcome.DUPLICATE]: "warning",
  [ScanOutcome.REJECTED]: "danger",
};

/** Never trust an unrecognised wire value: fall back to the neutral tone. */
export function resolveTone(map: Record<string, StatusTone>, value: string): StatusTone {
  return map[value] ?? STATUS_TONE_FALLBACK;
}
