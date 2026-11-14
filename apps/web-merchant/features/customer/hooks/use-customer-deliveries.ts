"use client";

import * as React from "react";
import { toast } from "sonner";
import { useLazyGetPublicTrackingQuery } from "@/features/parcels/api/parcels.api";
import { ParcelStatus, type PublicTrackingResponse } from "@dhruto/contracts";

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
  codAmount: number;
  isPaid: boolean;
  itemsDescription: string;
  riderName?: string;
  riderPhone?: string;
  otp: string;
  deliveredAt?: string;
  deliveryNote?: string;
  updatedAt?: string;
  timeline?: PublicTrackingResponse["timeline"];
}

const STORAGE_KEY = "dhruto_customer_deliveries_v2";

/**
 * Seed deliveries that match actual database records (seeded parcels)
 * and provide rich starting context for customer demo & operational validation.
 */
const INITIAL_DELIVERIES: CustomerDelivery[] = [
  {
    id: "del-nnn27t",
    trackingCode: "DHR-20261114-NNN27T",
    merchantName: "Dhruto Express Parcel",
    destination: "Zindabazar, Sylhet",
    district: "Sylhet",
    thana: "Zindabazar",
    status: ParcelStatus.ORIGIN_HUB_RECEIVED,
    statusLabel: "Received at Origin Hub",
    eta: "In 1-2 Business Days",
    codAmount: 3500,
    isPaid: false,
    itemsDescription: "Live Inspection Shipment (2.5 kg)",
    otp: "719302",
  },
  {
    id: "del-107",
    trackingCode: "DHR-2610-00107",
    merchantName: "Aarong Fashion Store",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    district: "Dhaka",
    thana: "Banani",
    status: ParcelStatus.OUT_FOR_DELIVERY,
    statusLabel: "Out for Delivery",
    eta: "Today by 04:30 PM",
    codAmount: 1850,
    isPaid: false,
    itemsDescription: "Silk Kurti & Accessories (1.2 kg)",
    riderName: "Kamrul Hasan",
    riderPhone: "+8801712398745",
    otp: "582419",
  },
  {
    id: "del-108",
    trackingCode: "DHR-2610-00108",
    merchantName: "Green Life Organics",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    district: "Dhaka",
    thana: "Banani",
    status: ParcelStatus.OUT_FOR_DELIVERY,
    statusLabel: "Out for Delivery",
    eta: "Today by 06:15 PM",
    codAmount: 1750,
    isPaid: false,
    itemsDescription: "Cold Pressed Mustard Oil & Sundarban Honey",
    riderName: "Karim Rider",
    riderPhone: "+8801700000003",
    otp: "319402",
  },
  {
    id: "del-113",
    trackingCode: "DHR-2610-00113",
    merchantName: "Apex Footwear Official",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    district: "Dhaka",
    thana: "Banani",
    status: ParcelStatus.IN_TRANSIT,
    statusLabel: "In Hub Transit",
    eta: "Tomorrow by 02:00 PM",
    codAmount: 0,
    isPaid: true,
    itemsDescription: "Leather Formal Shoes (Size 42)",
    otp: "941083",
  },
  {
    id: "del-111",
    trackingCode: "DHR-2610-00111",
    merchantName: "Gadget & Gear BD",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    district: "Dhaka",
    thana: "Banani",
    status: ParcelStatus.DESTINATION_HUB_RECEIVED,
    statusLabel: "Sorted at Local Hub",
    eta: "Tomorrow by 05:00 PM",
    codAmount: 1650,
    isPaid: false,
    itemsDescription: "MagSafe Wireless Charger (15W)",
    otp: "620584",
  },
  {
    id: "del-101",
    trackingCode: "DHR-2610-00101",
    merchantName: "Shajgoj Beauty Hub",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    district: "Dhaka",
    thana: "Banani",
    status: ParcelStatus.DELIVERED,
    statusLabel: "Delivered",
    eta: "Delivered",
    codAmount: 920,
    isPaid: true,
    itemsDescription: "Skincare Essentials Pack (0.8 kg)",
    riderName: "Rakibul Islam",
    riderPhone: "+8801819876543",
    otp: "740192",
    deliveredAt: "Yesterday at 03:15 PM",
  },
  {
    id: "del-102",
    trackingCode: "DHR-2610-00102",
    merchantName: "Navana Lifestyle Boutique",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    district: "Dhaka",
    thana: "Banani",
    status: ParcelStatus.DELIVERED,
    statusLabel: "Delivered",
    eta: "Delivered",
    codAmount: 2450,
    isPaid: true,
    itemsDescription: "Embroidered Cotton Panjabi",
    riderName: "Karim Rider",
    riderPhone: "+8801700000003",
    otp: "852319",
    deliveredAt: "Oct 09, 2026 at 01:45 PM",
  },
];

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
function estimateEtaFromStatus(status: ParcelStatus | string): string {
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

/**
 * Centralized dynamic hook for managing customer deliveries, live network lookups,
 * doorstep OTPs, rescheduling, and status synchronization.
 */
export function useCustomerDeliveries() {
  const [deliveries, setDeliveries] = React.useState<CustomerDelivery[]>(INITIAL_DELIVERIES);
  const [activeTrackingCode, setActiveTrackingCode] = React.useState<string>("DHR-2610-00107");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const [triggerFetchTracking] = useLazyGetPublicTrackingQuery();

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
        const updatedList = await Promise.all(
          listToRefresh.map(async (delivery) => {
            try {
              const res = await triggerFetchTracking(delivery.trackingCode).unwrap();
              if (res.data) {
                updatedCount++;
                const isDelivered = res.data.status === ParcelStatus.DELIVERED;
                return {
                  ...delivery,
                  status: res.data.status,
                  statusLabel: formatStatusLabel(res.data.status),
                  district: res.data.recipientDistrict ?? delivery.district,
                  thana: res.data.recipientThana ?? delivery.thana,
                  destination:
                    res.data.recipientThana && res.data.recipientDistrict
                      ? `${res.data.recipientThana}, ${res.data.recipientDistrict}`
                      : delivery.destination,
                  timeline: res.data.timeline,
                  updatedAt: res.data.updatedAt,
                  eta: isDelivered ? "Delivered" : delivery.eta,
                  isPaid: isDelivered ? true : delivery.isPaid,
                };
              }
            } catch {
              // Keep existing if fetch fails
            }
            return delivery;
          })
        );

        saveDeliveries(updatedList);
        if (!silent) {
          toast.success(`Live telemetry synced for ${updatedCount} deliveries.`);
        }
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [deliveries, saveDeliveries, triggerFetchTracking]
  );

  // Load persisted state from localStorage on client mount & auto-sync live database
  React.useEffect(() => {
    let initialList = INITIAL_DELIVERIES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomerDelivery[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingCodes = new Set(parsed.map((p) => p.trackingCode.toUpperCase()));
          const missingInitial = INITIAL_DELIVERIES.filter(
            (init) => !existingCodes.has(init.trackingCode.toUpperCase())
          );
          initialList = [...parsed, ...missingInitial];
        }
      }
    } catch {
      // Fallback to initial seed deliveries
    }

    setDeliveries(initialList);
    const firstActive = initialList.find(
      (d) => d.status === ParcelStatus.OUT_FOR_DELIVERY || d.status !== ParcelStatus.DELIVERED
    );
    if (firstActive) {
      setActiveTrackingCode(firstActive.trackingCode);
    }

    // Auto-sync live database status for all shipments in background
    void refreshAllDeliveries(initialList, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Currently spotlighted active delivery
  const activeShipment = React.useMemo(() => {
    return (
      deliveries.find((d) => d.trackingCode === activeTrackingCode) ||
      deliveries.find((d) => d.status === ParcelStatus.OUT_FOR_DELIVERY) ||
      deliveries.find((d) => d.status !== ParcelStatus.DELIVERED) ||
      deliveries[0]
    );
  }, [deliveries, activeTrackingCode]);

  // Dynamic statistics
  const incomingCount = React.useMemo(() => {
    return deliveries.filter(
      (d) => d.status !== ParcelStatus.DELIVERED && d.status !== ParcelStatus.CANCELLED
    ).length;
  }, [deliveries]);

  const arrivingTodayCount = React.useMemo(() => {
    return deliveries.filter(
      (d) =>
        d.status === ParcelStatus.OUT_FOR_DELIVERY ||
        d.eta.toLowerCase().includes("today")
    ).length;
  }, [deliveries]);

  const deliveredCount = React.useMemo(() => {
    return deliveries.filter((d) => d.status === ParcelStatus.DELIVERED).length;
  }, [deliveries]);

  const totalCodDue = React.useMemo(() => {
    return deliveries
      .filter((d) => d.status !== ParcelStatus.DELIVERED && !d.isPaid)
      .reduce((acc, d) => acc + (d.codAmount || 0), 0);
  }, [deliveries]);

  const primaryLocation = React.useMemo(() => {
    return activeShipment?.thana || activeShipment?.district || "Banani";
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

        const isDelivered = trackingData.status === ParcelStatus.DELIVERED;
        const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
        const destination =
          trackingData.recipientThana && trackingData.recipientDistrict
            ? `${trackingData.recipientThana}, ${trackingData.recipientDistrict}`
            : trackingData.recipientDistrict || "Dhaka, Bangladesh";

        const newDelivery: CustomerDelivery = {
          id: `del-${Date.now()}`,
          trackingCode: trackingData.trackingCode,
          merchantName: "Dhruto Merchant Partner",
          destination,
          district: trackingData.recipientDistrict,
          thana: trackingData.recipientThana,
          status: trackingData.status,
          statusLabel: formatStatusLabel(trackingData.status),
          eta: estimateEtaFromStatus(trackingData.status),
          codAmount: isDelivered ? 0 : 1200,
          isPaid: isDelivered,
          itemsDescription: `Shipment Package (${trackingData.trackingCode})`,
          riderName: trackingData.status === ParcelStatus.OUT_FOR_DELIVERY ? "Dhruto Express Rider" : undefined,
          otp: generatedOtp,
          deliveredAt: isDelivered ? new Date(trackingData.updatedAt).toLocaleDateString() : undefined,
          timeline: trackingData.timeline,
        };

        const updated = [newDelivery, ...deliveries];
        saveDeliveries(updated);
        setActiveTrackingCode(newDelivery.trackingCode);
        toast.success(`Shipment ${code} successfully connected to your dashboard!`);
        return true;
      } catch {
        toast.error(`Could not locate ${code} on the network. Check the tracking code and try again.`);
        return false;
      }
    },
    [deliveries, saveDeliveries, triggerFetchTracking]
  );


  /**
   * Reschedule delivery time and attach custom rider instructions
   */
  const rescheduleDelivery = React.useCallback(
    (
      code: string,
      details: {
        dateChoice: "today" | "tomorrow" | "dayAfter";
        slotLabel: string;
        instruction: string;
        customNote: string;
      }
    ) => {
      const updated = deliveries.map((d) => {
        if (d.trackingCode === code) {
          const datePrefix =
            details.dateChoice === "today"
              ? "Today"
              : details.dateChoice === "tomorrow"
              ? "Tomorrow"
              : "In 2 Days";
          return {
            ...d,
            status: ParcelStatus.RESCHEDULED,
            statusLabel: "Rescheduled",
            eta: `${datePrefix} (${details.slotLabel})`,
            deliveryNote: details.instruction,
          };
        }
        return d;
      });

      saveDeliveries(updated);
    },
    [deliveries, saveDeliveries]
  );

  /**
   * Mark shipment as delivered
   */
  const markAsDelivered = React.useCallback(
    (code: string) => {
      const updated = deliveries.map((d) => {
        if (d.trackingCode === code) {
          return {
            ...d,
            status: ParcelStatus.DELIVERED,
            statusLabel: "Delivered",
            eta: "Delivered",
            isPaid: true,
            deliveredAt: "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }
        return d;
      });
      saveDeliveries(updated);
      toast.success(`Handoff logged: ${code} marked as delivered.`);
    },
    [deliveries, saveDeliveries]
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
    [deliveries, activeTrackingCode, saveDeliveries]
  );

  /**
   * Reset deliveries back to default seed data
   */
  const resetToDefaults = React.useCallback(() => {
    saveDeliveries(INITIAL_DELIVERIES);
    setActiveTrackingCode("DHR-2610-00107");
    toast.success("Reset dashboard deliveries to defaults.");
  }, [saveDeliveries]);

  return {
    deliveries,
    activeShipment,
    activeTrackingCode,
    setActiveTrackingCode,
    isRefreshing,
    incomingCount,
    arrivingTodayCount,
    deliveredCount,
    totalCodDue,
    primaryLocation,
    addDeliveryByTrackingCode,
    refreshAllDeliveries,
    rescheduleDelivery,
    markAsDelivered,
    removeDelivery,
    resetToDefaults,
  };
}
