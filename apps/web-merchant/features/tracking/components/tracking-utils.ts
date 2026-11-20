import { ParcelStatus } from "@dhruto/contracts";
import { Package, Building2, Truck, Radio, CheckCircle2 } from "lucide-react";

export type TrackingStatusTheme = "delivered" | "out_for_delivery" | "transit" | "return" | "default";

/**
 * Calculates human-readable 5-stage progress level (1-5) from ParcelStatus.
 */
export function getProgressLevel(status: ParcelStatus | string): number {
  switch (status) {
    case ParcelStatus.CREATED:
    case ParcelStatus.PICKUP_REQUESTED:
      return 1;
    case ParcelStatus.PICKUP_ASSIGNED:
    case ParcelStatus.PICKED_UP:
    case ParcelStatus.ORIGIN_HUB_RECEIVED:
    case ParcelStatus.BAGGED:
      return 2;
    case ParcelStatus.IN_TRANSIT:
    case ParcelStatus.DESTINATION_HUB_RECEIVED:
      return 3;
    case ParcelStatus.ASSIGNED_TO_RIDER:
    case ParcelStatus.OUT_FOR_DELIVERY:
    case ParcelStatus.DELIVERY_ATTEMPTED:
    case ParcelStatus.RESCHEDULED:
      return 4;
    case ParcelStatus.DELIVERED:
    case ParcelStatus.CASH_PENDING:
    case ParcelStatus.CASH_VERIFIED:
      return 5;
    case ParcelStatus.RTO_INITIATED:
    case ParcelStatus.RETURN_IN_TRANSIT:
    case ParcelStatus.RETURNED_TO_MERCHANT:
    case ParcelStatus.CANCELLED:
    case ParcelStatus.LOST:
    case ParcelStatus.DAMAGED:
      return 3; // Exception
    default:
      return 1;
  }
}

export function getStatusTheme(status: ParcelStatus | string): TrackingStatusTheme {
  if (
    status === ParcelStatus.DELIVERED ||
    status === ParcelStatus.CASH_PENDING ||
    status === ParcelStatus.CASH_VERIFIED
  ) {
    return "delivered";
  }
  if (status === ParcelStatus.OUT_FOR_DELIVERY || status === ParcelStatus.ASSIGNED_TO_RIDER) {
    return "out_for_delivery";
  }
  if (
    status === ParcelStatus.IN_TRANSIT ||
    status === ParcelStatus.ORIGIN_HUB_RECEIVED ||
    status === ParcelStatus.DESTINATION_HUB_RECEIVED ||
    status === ParcelStatus.BAGGED
  ) {
    return "transit";
  }
  if (
    status === ParcelStatus.RTO_INITIATED ||
    status === ParcelStatus.RETURN_IN_TRANSIT ||
    status === ParcelStatus.RETURNED_TO_MERCHANT ||
    status === ParcelStatus.CANCELLED ||
    status === ParcelStatus.LOST ||
    status === ParcelStatus.DAMAGED
  ) {
    return "return";
  }
  return "default";
}

export const TRACKING_MILESTONES = [
  { step: 1, titleEn: "Order Created", titleBn: "অর্ডার তৈরি", icon: Package },
  { step: 2, titleEn: "Picked up", titleBn: "পিকআপ হয়েছে", icon: Building2 },
  { step: 3, titleEn: "In transit", titleBn: "ট্রানজিটে", icon: Truck },
  { step: 4, titleEn: "Out for Delivery", titleBn: "ডেলিভারিতে", icon: Radio },
  { step: 5, titleEn: "Delivered", titleBn: "ডেলিভার্ড", icon: CheckCircle2 },
] as const;
