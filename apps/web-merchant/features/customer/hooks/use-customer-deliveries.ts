"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  useGetParcelsQuery,
  useLazyGetPublicTrackingQuery,
  useRefreshDeliveryOtpMutation,
  useSetDeliveryPreferenceMutation,
} from "@/features/parcels/api/parcels.api";
import {
  ParcelStatus,
  isDeliveredStatus,
  type ParcelListItem,
  type PublicTrackingResponse,
} from "@dhruto/contracts";

export interface CustomerDelivery {
  id: string;
  trackingCode: string;
  merchantName: string;
  destination: string;
  district?: string;
  thana?: string;
  status: ParcelStatus | string;
  statusLabel: string;
  eta: string;
  /** `null` when unknown (parcel tracked by code but not addressed to this customer). */
  codAmount: number | null;
  isPaid: boolean;
  itemsDescription: string;
  riderName?: string;
  riderPhone?: string;
  otp: string;
  deliveredAt?: string;
  deliveryNote?: string;
  updatedAt?: string;
  timeline?: PublicTrackingResponse["timeline"];
  /** True for parcels addressed to this customer (API list); false for codes added manually. */
  isOwned: boolean;
}

export interface RescheduleDetails {
  /** Preferred day, YYYY-MM-DD (Asia/Dhaka). */
  date: string;
  slotLabel: string;
  instruction: string;
}

// v5: drops records cached by older builds that contained simulated rider/COD data.
const STORAGE_KEY = "dhruto_customer_deliveries_v5";

/**
 * Format a status string into a human-readable title
 */
export function formatStatusLabel(status: ParcelStatus | string): string {
  switch (status) {
    case ParcelStatus.CREATED:
    case "BOOKED":
      return "Booking Confirmed";
    case ParcelStatus.PICKUP_REQUESTED:
      return "Pickup Requested";
    case ParcelStatus.PICKUP_ASSIGNED:
      return "Rider Assigned for Pickup";
    case ParcelStatus.PICKED_UP:
      return "Picked Up from Merchant";
    case ParcelStatus.ORIGIN_HUB_RECEIVED:
      return "Received at Origin Hub";
    case ParcelStatus.BAGGED:
      return "Bagged for Linehaul";
    case ParcelStatus.IN_TRANSIT:
    case "IN_TRANSIT":
      return "In Hub Transit";
    case ParcelStatus.DESTINATION_HUB_RECEIVED:
      return "Arrived at Local Hub";
    case ParcelStatus.ASSIGNED_TO_RIDER:
      return "Assigned to Delivery Rider";
    case ParcelStatus.OUT_FOR_DELIVERY:
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case ParcelStatus.DELIVERY_ATTEMPTED:
      return "Delivery Attempted";
    case ParcelStatus.RESCHEDULED:
      return "Delivery Rescheduled";
    case ParcelStatus.DELIVERED:
    case "DELIVERED":
      return "Delivered";
    case ParcelStatus.RTO_INITIATED:
      return "Return Initiated";
    case ParcelStatus.RETURN_IN_TRANSIT:
      return "Return in Transit";
    case ParcelStatus.RETURNED_TO_MERCHANT:
      return "Returned to Store";
    case ParcelStatus.CANCELLED:
      return "Cancelled";
    default:
      return String(status).replace(/_/g, " ");
  }
}

/**
 * Generates an ETA estimation from status
 */
export function estimateEtaFromStatus(status: ParcelStatus | string): string {
  switch (status) {
    case ParcelStatus.OUT_FOR_DELIVERY:
    case "OUT_FOR_DELIVERY":
      return "Today by 05:00 PM";
    case ParcelStatus.DESTINATION_HUB_RECEIVED:
    case ParcelStatus.ASSIGNED_TO_RIDER:
      return "Tomorrow by 01:00 PM";
    case ParcelStatus.IN_TRANSIT:
    case "IN_TRANSIT":
      return "Tomorrow by 04:00 PM";
    case ParcelStatus.DELIVERED:
    case "DELIVERED":
      return "Delivered";
    case ParcelStatus.RETURNED_TO_MERCHANT:
      return "Returned";
    default:
      return "In 2-3 Business Days";
  }
}

/** "Wed, 19 Nov (Afternoon ...)" style ETA from a saved delivery preference. */
function etaFromPreference(pref: NonNullable<ParcelListItem["deliveryPreference"]>): string {
  const day = pref.date
    ? new Date(`${pref.date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "Preferred day";
  return pref.slot ? `${day} (${pref.slot})` : day;
}

/**
 * Recipient-facing status: internal cash settlement after the handoff
 * (CASH_PENDING / CASH_VERIFIED) is shown as DELIVERED, so delivered parcels
 * are never treated as active (no OTP, no reschedule, correct filters).
 */
export function customerFacingStatus(status: string): string {
  return isDeliveredStatus(status) ? ParcelStatus.DELIVERED : status;
}

export function mapParcelListItemToDelivery(parcel: ParcelListItem): CustomerDelivery {
  const isDelivered = isDeliveredStatus(parcel.status);
  const isPaid = isDelivered || Number(parcel.codAmount) === 0;
  const destination =
    parcel.thana && parcel.district
      ? `${parcel.thana}, ${parcel.district}`
      : parcel.deliveryAddress || parcel.district || "Dhaka, Bangladesh";

  return {
    id: parcel.id,
    trackingCode: parcel.trackingCode,
    merchantName: parcel.merchantName || "Merchant",
    destination,
    district: parcel.district,
    thana: parcel.thana,
    status: customerFacingStatus(parcel.status),
    statusLabel: formatStatusLabel(customerFacingStatus(parcel.status)),
    eta:
      parcel.deliveryPreference && !isDelivered
        ? etaFromPreference(parcel.deliveryPreference)
        : estimateEtaFromStatus(parcel.status),
    codAmount: Number(parcel.codAmount) || 0,
    isPaid,
    itemsDescription: parcel.parcelDescription || `Shipment Package (${parcel.trackingCode})`,
    // Rider name: while active and on delivered parcels; phone only while active.
    riderName: parcel.riderName ?? undefined,
    riderPhone: parcel.riderPhone ?? undefined,
    // Only the server issues delivery OTPs; an empty value renders as "not issued yet".
    otp: parcel.deliveryOtp ?? "",
    deliveredAt: isDelivered ? formatHandoff(parcel.deliveredAt) : undefined,
    deliveryNote: parcel.deliveryPreference?.note ?? undefined,
    updatedAt: parcel.updatedAt,
    isOwned: true,
  };
}

/** Formats a real handoff timestamp; unknown stays `undefined` (never invented). */
function formatHandoff(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapTrackingResponseToDelivery(
  tracking: PublicTrackingResponse,
  fallback?: Partial<CustomerDelivery>,
): CustomerDelivery {
  const isDelivered = isDeliveredStatus(tracking.status);
  const destination =
    tracking.recipientThana && tracking.recipientDistrict
      ? `${tracking.recipientThana}, ${tracking.recipientDistrict}`
      : tracking.recipientDistrict || fallback?.destination || "Dhaka, Bangladesh";

  return {
    id: fallback?.id || `del-${tracking.trackingCode}`,
    trackingCode: tracking.trackingCode,
    merchantName: fallback?.merchantName || "Merchant",
    destination,
    district: tracking.recipientDistrict ?? fallback?.district,
    thana: tracking.recipientThana ?? fallback?.thana,
    status: customerFacingStatus(tracking.status),
    statusLabel: formatStatusLabel(customerFacingStatus(tracking.status)),
    // Keep a preference-based ETA from the owned record while not delivered.
    eta: isDelivered ? "Delivered" : fallback?.eta || estimateEtaFromStatus(tracking.status),
    // Public tracking does not disclose COD: unknown unless the owned record had it.
    codAmount: fallback?.codAmount ?? null,
    isPaid: isDelivered ? true : (fallback?.isPaid ?? false),
    itemsDescription: fallback?.itemsDescription || `Shipment Package (${tracking.trackingCode})`,
    // Public tracking has no rider contact; keep what the owned API record provided.
    riderName: fallback?.riderName,
    riderPhone: fallback?.riderPhone,
    otp: fallback?.otp ?? "",
    deliveredAt: isDelivered
      ? (fallback?.deliveredAt ??
        formatHandoff(
          tracking.timeline.find((event) => event.status === ParcelStatus.DELIVERED)?.timestamp,
        ))
      : undefined,
    deliveryNote: fallback?.deliveryNote,
    updatedAt: tracking.updatedAt,
    timeline: tracking.timeline,
    isOwned: fallback?.isOwned ?? false,
  };
}

/**
 * Centralized dynamic hook for managing customer deliveries, live network lookups,
 * doorstep OTPs, rescheduling, and status synchronization.
 * 100% dynamic — no static hardcoded mock datasets.
 */
export function useCustomerDeliveries() {
  const [deliveries, setDeliveries] = React.useState<CustomerDelivery[]>([]);
  const [activeTrackingCode, setActiveTrackingCode] = React.useState<string>("");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Live database queries
  const {
    data: parcelsResponse,
    isLoading: isLoadingParcels,
    refetch: refetchParcels,
  } = useGetParcelsQuery({ limit: 50 });
  const [triggerFetchTracking] = useLazyGetPublicTrackingQuery();
  const [triggerRefreshOtpMutation] = useRefreshDeliveryOtpMutation();
  const [triggerSetPreference] = useSetDeliveryPreferenceMutation();

  // Sync state to localStorage whenever deliveries change
  const saveDeliveries = React.useCallback((next: CustomerDelivery[]) => {
    setDeliveries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable or full
    }
  }, []);

  /**
   * Re-sync deliveries against live API telemetry
   */
  const refreshAllDeliveries = React.useCallback(
    async (targetList?: CustomerDelivery[], silent = false) => {
      if (!silent) setIsRefreshing(true);
      let updatedCount = 0;

      const listToRefresh = targetList && targetList.length > 0 ? targetList : deliveries;

      try {
        await refetchParcels();
        const updatedList = await Promise.all(
          listToRefresh.map(async (delivery) => {
            try {
              const res = await triggerFetchTracking(delivery.trackingCode).unwrap();
              if (res.data) {
                updatedCount++;
                return mapTrackingResponseToDelivery(res.data, delivery);
              }
            } catch {
              // Keep existing if fetch fails
            }
            return delivery;
          }),
        );

        saveDeliveries(updatedList);
        if (!silent) {
          toast.success(`Live telemetry synced for ${updatedCount} deliveries.`);
        }
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [deliveries, refetchParcels, saveDeliveries, triggerFetchTracking],
  );

  // Synchronize when real database parcels are loaded from GET /api/v1/parcels
  React.useEffect(() => {
    async function syncDynamicParcels() {
      const dbParcels = parcelsResponse?.data || [];
      const dbDeliveries = dbParcels.map(mapParcelListItemToDelivery);

      // Check for locally saved deliveries / codes
      let storedDeliveries: CustomerDelivery[] = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CustomerDelivery[];
          if (Array.isArray(parsed)) {
            storedDeliveries = parsed;
          }
        }
      } catch {
        // LocalStorage unavailable
      }

      // Merge: DB deliveries take priority, followed by codes the customer added themselves.
      const mergedMap = new Map<string, CustomerDelivery>();

      for (const d of dbDeliveries) {
        mergedMap.set(d.trackingCode.toUpperCase(), d);
      }

      for (const d of storedDeliveries) {
        const key = d.trackingCode.toUpperCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, d);
        }
      }

      const finalList = Array.from(mergedMap.values());
      if (finalList.length > 0) {
        setDeliveries(finalList);

        // Keep active tracking code in sync
        const activeExists = finalList.some((d) => d.trackingCode === activeTrackingCode);
        if (!activeExists) {
          const firstPending =
            finalList.find((d) => d.status === ParcelStatus.OUT_FOR_DELIVERY) ||
            finalList.find((d) => d.status !== ParcelStatus.DELIVERED) ||
            finalList[0];
          if (firstPending) {
            setActiveTrackingCode(firstPending.trackingCode);
          }
        }
      }
    }

    void syncDynamicParcels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelsResponse]);

  // Currently spotlighted active delivery
  const activeShipment = React.useMemo(() => {
    return (
      deliveries.find((d) => d.trackingCode === activeTrackingCode) ||
      deliveries.find((d) => d.status === ParcelStatus.OUT_FOR_DELIVERY) ||
      deliveries.find((d) => d.status !== ParcelStatus.DELIVERED) ||
      deliveries[0]
    );
  }, [deliveries, activeTrackingCode]);

  // Dynamic statistics calculated strictly from real data
  const incomingCount = React.useMemo(() => {
    return deliveries.filter(
      (d) => d.status !== ParcelStatus.DELIVERED && d.status !== ParcelStatus.CANCELLED,
    ).length;
  }, [deliveries]);

  const arrivingTodayCount = React.useMemo(() => {
    return deliveries.filter(
      (d) => d.status === ParcelStatus.OUT_FOR_DELIVERY || d.eta.toLowerCase().includes("today"),
    ).length;
  }, [deliveries]);

  const deliveredCount = React.useMemo(() => {
    return deliveries.filter((d) => d.status === ParcelStatus.DELIVERED).length;
  }, [deliveries]);

  const totalCodDue = React.useMemo(() => {
    return deliveries
      .filter((d) => d.status !== ParcelStatus.DELIVERED && !d.isPaid)
      .reduce((acc, d) => acc + (d.codAmount ?? 0), 0);
  }, [deliveries]);

  const primaryLocation = React.useMemo(() => {
    return activeShipment?.thana || activeShipment?.district || "Dhaka";
  }, [activeShipment]);

  /**
   * Dynamically add/connect a parcel to the customer's dashboard
   * by querying the live network tracking endpoint.
   */
  const addDeliveryByTrackingCode = React.useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) {
        toast.error("Please enter a valid tracking code");
        return false;
      }

      // Check if already in list
      const existing = deliveries.find((d) => d.trackingCode.toUpperCase() === code);
      if (existing) {
        setActiveTrackingCode(existing.trackingCode);
        toast.info(`${code} is already in your tracked deliveries`);
        return true;
      }

      try {
        const res = await triggerFetchTracking(code).unwrap();
        const trackingData = res.data;

        if (!trackingData) {
          toast.error(`Shipment not found for tracking code: ${code}`);
          return false;
        }

        const newDelivery = mapTrackingResponseToDelivery(trackingData);
        const updated = [newDelivery, ...deliveries];
        saveDeliveries(updated);
        setActiveTrackingCode(newDelivery.trackingCode);
        toast.success(`Shipment ${code} successfully connected to your dashboard!`);
        return true;
      } catch {
        toast.error(
          `Could not locate ${code} on the network. Check the tracking code and try again.`,
        );
        return false;
      }
    },
    [deliveries, saveDeliveries, triggerFetchTracking],
  );

  /**
   * Save the recipient's delivery preference (day, slot, instruction) via the API.
   * Resolves true on success. Status is never changed client-side: the server
   * records a preference for hub/rider planning, not a state transition.
   */
  const rescheduleDelivery = React.useCallback(
    async (code: string, details: RescheduleDetails): Promise<boolean> => {
      const target = deliveries.find((d) => d.trackingCode === code);
      if (!target?.isOwned) {
        toast.error("Only parcels addressed to you can be rescheduled.");
        return false;
      }
      try {
        const res = await triggerSetPreference({
          id: target.id,
          body: { date: details.date, slot: details.slotLabel, note: details.instruction },
        }).unwrap();
        const pref = res.data;
        if (pref) {
          saveDeliveries(
            deliveries.map((d) =>
              d.trackingCode === code
                ? { ...d, eta: etaFromPreference(pref), deliveryNote: pref.note ?? undefined }
                : d,
            ),
          );
        }
        toast.success(`Delivery preference saved for ${code}.`);
        return true;
      } catch (err) {
        const message =
          (err as { data?: { message?: string } })?.data?.message ??
          "Could not save your delivery preference. Please try again.";
        toast.error(message);
        return false;
      }
    },
    [deliveries, saveDeliveries, triggerSetPreference],
  );

  /**
   * Remove tracked delivery
   */
  const removeDelivery = React.useCallback(
    (code: string) => {
      const updated = deliveries.filter((d) => d.trackingCode !== code);
      saveDeliveries(updated);
      if (activeTrackingCode === code && updated.length > 0) {
        setActiveTrackingCode(updated[0]?.trackingCode ?? "");
      }
      toast.info(`Removed ${code} from your delivery dashboard.`);
    },
    [deliveries, activeTrackingCode, saveDeliveries],
  );

  /**
   * Re-generate or issue a fresh unique delivery OTP for a specific parcel
   * Synchronizes with backend database and rider verification
   */
  const refreshOtp = React.useCallback(
    async (code: string) => {
      const target = deliveries.find((d) => d.trackingCode === code);
      if (!target?.isOwned) {
        toast.error("Delivery OTPs are only available for parcels addressed to you.");
        return "";
      }
      const targetId = target.id;
      let freshOtp = "";
      try {
        const res = await triggerRefreshOtpMutation(targetId).unwrap();
        if (res.data?.otp) {
          freshOtp = res.data.otp;
        }
      } catch {
        // Never show a locally invented OTP: the rider verifies against the server hash.
        toast.error(`Could not issue a fresh OTP for ${code}. Please try again.`);
        return "";
      }

      if (freshOtp) {
        const updated = deliveries.map((d) => {
          if (d.trackingCode === code) {
            return {
              ...d,
              otp: freshOtp,
            };
          }
          return d;
        });
        saveDeliveries(updated);
        toast.success(`Fresh doorstep OTP generated for ${code}: ${freshOtp}`);
        return freshOtp;
      }
      return freshOtp;
    },
    [deliveries, triggerRefreshOtpMutation, saveDeliveries],
  );

  /**
   * Reset deliveries and refresh from live database
   */
  const resetToDefaults = React.useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
    void refetchParcels();
    setActiveTrackingCode("");
    toast.success("Synchronized deliveries with live database.");
  }, [refetchParcels]);

  return {
    deliveries,
    activeShipment,
    activeTrackingCode,
    setActiveTrackingCode,
    isLoading: isLoadingParcels && deliveries.length === 0,
    isRefreshing,
    incomingCount,
    arrivingTodayCount,
    deliveredCount,
    totalCodDue,
    primaryLocation,
    addDeliveryByTrackingCode,
    refreshAllDeliveries,
    rescheduleDelivery,
    removeDelivery,
    refreshOtp,
    resetToDefaults,
  };
}
