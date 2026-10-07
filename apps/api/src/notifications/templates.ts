import {
  DomainEventType,
  type DiscrepancyVars,
  type HandInSubmittedVars,
  type ParcelCreatedVars,
  type ParcelDeliveredVars,
  type ParcelFailedVars,
  type ParcelOutForDeliveryVars,
  type PayoutVars,
  type RenderedTemplate,
  type SettlementCreatedVars,
} from "@dhruto/contracts";

/**
 * Centralized bilingual notification templates — Phase 5.
 * ------------------------------------------------------------------
 * Every template is a pure function of strictly-typed variables (never
 * `Record<string, any>`). SMS bodies stay under one segment where possible;
 * in-app titles stay short. Financial figures render with explicit ৳ amounts
 * from the event payload — the template layer never computes money.
 */

export type TemplateKey =
  | "parcel_created"
  | "parcel_assigned"
  | "parcel_out_for_delivery"
  | "parcel_delivered"
  | "parcel_failed"
  | "parcel_returned"
  | "cash_hand_in_submitted"
  | "cash_verified"
  | "settlement_created"
  | "payout_requested"
  | "payout_approved"
  | "payout_completed"
  | "payout_failed"
  | "discrepancy_opened";

export const TEMPLATE_KEYS: readonly TemplateKey[] = [
  "parcel_created",
  "parcel_assigned",
  "parcel_out_for_delivery",
  "parcel_delivered",
  "parcel_failed",
  "parcel_returned",
  "cash_hand_in_submitted",
  "cash_verified",
  "settlement_created",
  "payout_requested",
  "payout_approved",
  "payout_completed",
  "payout_failed",
  "discrepancy_opened",
] as const;

/** Maps a domain event to its template (events without a template stay silent). */
export const EVENT_TEMPLATES: Readonly<Record<DomainEventType, TemplateKey | null>> = {
  [DomainEventType.PARCEL_CREATED]: "parcel_created",
  [DomainEventType.PARCEL_ASSIGNED]: "parcel_assigned",
  [DomainEventType.PARCEL_OUT_FOR_DELIVERY]: "parcel_out_for_delivery",
  [DomainEventType.PARCEL_DELIVERED]: "parcel_delivered",
  [DomainEventType.PARCEL_FAILED]: "parcel_failed",
  [DomainEventType.PARCEL_RETURNED]: "parcel_returned",
  [DomainEventType.CASH_HAND_IN_SUBMITTED]: "cash_hand_in_submitted",
  [DomainEventType.CASH_VERIFIED]: "cash_verified",
  [DomainEventType.SETTLEMENT_CREATED]: "settlement_created",
  [DomainEventType.PAYOUT_REQUESTED]: "payout_requested",
  [DomainEventType.PAYOUT_APPROVED]: "payout_approved",
  [DomainEventType.PAYOUT_COMPLETED]: "payout_completed",
  [DomainEventType.PAYOUT_FAILED]: "payout_failed",
  [DomainEventType.DISCREPANCY_OPENED]: "discrepancy_opened",
  [DomainEventType.DISCREPANCY_RESOLVED]: null,
};

function taka(minor: number): string {
  return `৳${(minor / 100).toLocaleString("en-US")}`;
}

export function renderParcelCreated(vars: ParcelCreatedVars): RenderedTemplate {
  return {
    en: {
      title: "New parcel booked",
      body: `Dhruto: parcel ${vars.trackingCode} for ${vars.recipientName} is booked and awaiting pickup.`,
    },
    bn: {
      title: "নতুন পার্সেল বুক হয়েছে",
      body: `Dhruto: ${vars.recipientName}-এর জন্য পার্সেল ${vars.trackingCode} বুক হয়েছে, পিকআপের অপেক্ষায়।`,
    },
  };
}

export function renderParcelAssigned(vars: ParcelCreatedVars): RenderedTemplate {
  return {
    en: {
      title: "Rider assigned",
      body: `Dhruto: parcel ${vars.trackingCode} for ${vars.recipientName} is assigned to a rider.`,
    },
    bn: {
      title: "রাইডার নির্ধারিত",
      body: `Dhruto: ${vars.recipientName}-এর পার্সেল ${vars.trackingCode} একজন রাইডারকে দেওয়া হয়েছে।`,
    },
  };
}

export function renderParcelOutForDelivery(vars: ParcelOutForDeliveryVars): RenderedTemplate {
  return {
    en: {
      title: "Out for delivery",
      body: `Dhruto: parcel ${vars.trackingCode} is out for delivery. Share your OTP with the rider to receive it.`,
    },
    bn: {
      title: "ডেলিভারির পথে",
      body: `Dhruto: পার্সেল ${vars.trackingCode} ডেলিভারির পথে। গ্রহণের জন্য আপনার OTP রাইডারকে দিন।`,
    },
  };
}

export function renderParcelDelivered(vars: ParcelDeliveredVars): RenderedTemplate {
  const cod = vars.codCollected > 0 ? ` COD collected: ৳${vars.codCollected.toLocaleString("en-US")}.` : "";
  const codBn =
    vars.codCollected > 0 ? ` সংগৃহীত COD: ৳${vars.codCollected.toLocaleString("en-US")}।` : "";
  return {
    en: {
      title: "Parcel delivered",
      body: `Dhruto: parcel ${vars.trackingCode} delivered successfully.${cod}`,
    },
    bn: {
      title: "পার্সেল ডেলিভারি সম্পন্ন",
      body: `Dhruto: পার্সেল ${vars.trackingCode} সফলভাবে ডেলিভারি হয়েছে।${codBn}`,
    },
  };
}

export function renderParcelFailed(vars: ParcelFailedVars): RenderedTemplate {
  return {
    en: {
      title: "Delivery attempt failed",
      body: `Dhruto: delivery of ${vars.trackingCode} failed (${vars.reason}). We will retry or reschedule.`,
    },
    bn: {
      title: "ডেলিভারি চেষ্টা ব্যর্থ",
      body: `Dhruto: ${vars.trackingCode} ডেলিভারি ব্যর্থ (${vars.reason})। পুনরায় চেষ্টা করা হবে।`,
    },
  };
}

export function renderParcelReturned(vars: ParcelCreatedVars): RenderedTemplate {
  return {
    en: {
      title: "Parcel returned",
      body: `Dhruto: parcel ${vars.trackingCode} for ${vars.recipientName} was returned to the merchant.`,
    },
    bn: {
      title: "পার্সেল ফেরত",
      body: `Dhruto: ${vars.recipientName}-এর পার্সেল ${vars.trackingCode} মার্চেন্টের কাছে ফেরত গেছে।`,
    },
  };
}

export function renderHandInSubmitted(vars: HandInSubmittedVars): RenderedTemplate {
  return {
    en: {
      title: "Cash hand-in submitted",
      body: `Dhruto: hand-in ${vars.handinCode} with ${vars.itemCount} collections (${taka(vars.totalMinor)}) is awaiting hub verification.`,
    },
    bn: {
      title: "ক্যাশ হ্যান্ড-ইন জমা",
      body: `Dhruto: ${vars.itemCount}টি সংগ্রহসহ হ্যান্ড-ইন ${vars.handinCode} (${taka(vars.totalMinor)}) হাব যাচাইয়ের অপেক্ষায়।`,
    },
  };
}

export function renderCashVerified(vars: SettlementCreatedVars): RenderedTemplate {
  return {
    en: {
      title: "Cash verified & settled",
      body: `Dhruto: COD for ${vars.trackingCode} verified. ৳${vars.netAmount.toLocaleString("en-US")} credited to your wallet.`,
    },
    bn: {
      title: "ক্যাশ যাচাই ও সেটেল",
      body: `Dhruto: ${vars.trackingCode}-এর COD যাচাই হয়েছে। ৳${vars.netAmount.toLocaleString("en-US")} ওয়ালেটে জমা হয়েছে।`,
    },
  };
}

export function renderSettlementCreated(vars: SettlementCreatedVars): RenderedTemplate {
  return {
    en: {
      title: "Settlement posted",
      body: `Dhruto: settlement ${vars.settlementCode} for ${vars.trackingCode} posted (net ৳${vars.netAmount.toLocaleString("en-US")}).`,
    },
    bn: {
      title: "সেটেলমেন্ট পোস্ট",
      body: `Dhruto: ${vars.trackingCode}-এর সেটেলমেন্ট ${vars.settlementCode} পোস্ট হয়েছে (নিট ৳${vars.netAmount.toLocaleString("en-US")})।`,
    },
  };
}

export function renderPayoutRequested(vars: PayoutVars): RenderedTemplate {
  return {
    en: {
      title: "Payout requested",
      body: `Dhruto: payout ${vars.payoutCode} for ৳${vars.amount.toLocaleString("en-US")} via ${vars.method} is under review.`,
    },
    bn: {
      title: "পেআউট অনুরোধ",
      body: `Dhruto: ${vars.method}-এ ৳${vars.amount.toLocaleString("en-US")} পেআউট ${vars.payoutCode} পর্যালোচনাধীন।`,
    },
  };
}

export function renderPayoutApproved(vars: PayoutVars): RenderedTemplate {
  return {
    en: {
      title: "Payout approved",
      body: `Dhruto: payout ${vars.payoutCode} for ৳${vars.amount.toLocaleString("en-US")} is approved and queued for disbursement.`,
    },
    bn: {
      title: "পেআউট অনুমোদিত",
      body: `Dhruto: ৳${vars.amount.toLocaleString("en-US")} পেআউট ${vars.payoutCode} অনুমোদিত, বিতরণের অপেক্ষায়।`,
    },
  };
}

export function renderPayoutCompleted(vars: PayoutVars): RenderedTemplate {
  return {
    en: {
      title: "Payout disbursed",
      body: `Dhruto: payout ${vars.payoutCode} of ৳${vars.amount.toLocaleString("en-US")} via ${vars.method} completed.`,
    },
    bn: {
      title: "পেআউট সম্পন্ন",
      body: `Dhruto: ${vars.method}-এ ৳${vars.amount.toLocaleString("en-US")} পেআউট ${vars.payoutCode} সম্পন্ন।`,
    },
  };
}

export function renderPayoutFailed(vars: PayoutVars): RenderedTemplate {
  return {
    en: {
      title: "Payout needs attention",
      body: `Dhruto: payout ${vars.payoutCode} for ৳${vars.amount.toLocaleString("en-US")} could not complete. Funds were released back to your wallet.`,
    },
    bn: {
      title: "পেআউটে সমস্যা",
      body: `Dhruto: ৳${vars.amount.toLocaleString("en-US")} পেআউট ${vars.payoutCode} সম্পন্ন হয়নি। অর্থ ওয়ালেটে ফেরত গেছে।`,
    },
  };
}

export function renderDiscrepancyOpened(vars: DiscrepancyVars): RenderedTemplate {
  const diff = `${vars.differenceMinor > 0 ? "+" : ""}${taka(vars.differenceMinor)}`;
  return {
    en: {
      title: "Cash discrepancy opened",
      body: `Dhruto: counted cash for ${vars.trackingCode} differs by ${diff}. It is held for review, not absorbed.`,
    },
    bn: {
      title: "ক্যাশ অমিল খোলা হয়েছে",
      body: `Dhruto: ${vars.trackingCode}-এর গণনায় ${diff} পার্থক্য। পর্যালোচনার জন্য রাখা হয়েছে।`,
    },
  };
}
