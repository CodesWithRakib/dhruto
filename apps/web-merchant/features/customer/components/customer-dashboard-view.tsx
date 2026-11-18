"use client";

import * as React from "react";
import { useCustomerDeliveries, type CustomerDelivery } from "../hooks/use-customer-deliveries";
import { RescheduleModal } from "./reschedule-modal";
import { PodModal } from "./pod-modal";
import { toast } from "sonner";
import { CustomerIllustrationBg } from "@/components/visual/illustration-backgrounds";
import { CustomerWelcomeHero } from "./dashboard/customer-welcome-hero";
import { CustomerTrackInputCard } from "./dashboard/customer-track-input-card";
import { CustomerActiveShipmentCard } from "./dashboard/customer-active-shipment-card";
import { CustomerDeliveriesList } from "./dashboard/customer-deliveries-list";

export function CustomerDashboardView() {

  const {
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
    removeDelivery,
    refreshOtp,
  } = useCustomerDeliveries();

  const [showOtp, setShowOtp] = React.useState(true);

  // Modals state
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [activeTrackingForModal, setActiveTrackingForModal] = React.useState<string>("");
  const [podOpen, setPodOpen] = React.useState(false);
  const [selectedPodParcel, setSelectedPodParcel] = React.useState<CustomerDelivery | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleOpenPod = (item: CustomerDelivery) => {
    setSelectedPodParcel(item);
    setPodOpen(true);
  };

  const handleOpenReschedule = (code: string) => {
    setActiveTrackingForModal(code);
    setRescheduleOpen(true);
  };

  return (
    <div className="relative space-y-6">
      <CustomerIllustrationBg opacity={0.35} />

      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        trackingCode={activeTrackingForModal || activeShipment?.trackingCode || ""}
        currentAddress={activeShipment?.destination}
        onSubmit={(details) =>
          rescheduleDelivery(activeTrackingForModal || activeShipment?.trackingCode || "", details)
        }
      />

      {/* Proof of Delivery (POD) Modal */}
      {selectedPodParcel ? (
        <PodModal
          open={podOpen}
          onOpenChange={setPodOpen}
          parcel={{
            trackingCode: selectedPodParcel.trackingCode,
            deliveryAddress: selectedPodParcel.destination,
            deliveredAt: selectedPodParcel.deliveredAt,
            riderName: selectedPodParcel.riderName,
            merchantName: selectedPodParcel.merchantName,
            codAmount: selectedPodParcel.codAmount,
            description: selectedPodParcel.itemsDescription,
          }}
        />
      ) : null}

      {/* Dynamic Welcome & Live Pulse Banner */}
      <CustomerWelcomeHero
        incomingCount={incomingCount}
        arrivingTodayCount={arrivingTodayCount}
        deliveredCount={deliveredCount}
        totalCodDue={totalCodDue}
        primaryLocation={primaryLocation}
        isRefreshing={isRefreshing}
        onRefreshAll={() => refreshAllDeliveries()}
      />

      {/* Dynamic Instant Track & Connect Shipment Bar */}
      <CustomerTrackInputCard onAddTrackingCode={addDeliveryByTrackingCode} />

      {/* Active Delivery Spotlight Card */}
      {activeShipment ? (
        <CustomerActiveShipmentCard
          activeShipment={activeShipment}
          showOtp={showOtp}
          onToggleShowOtp={() => setShowOtp(!showOtp)}
          onCopy={handleCopy}
          onRefreshOtp={refreshOtp}
          onOpenReschedule={handleOpenReschedule}
          onOpenPod={handleOpenPod}
        />
      ) : null}

      {/* Deliveries Feed, Filters, Search & Centralized Pagination */}
      <CustomerDeliveriesList
        deliveries={deliveries}
        activeTrackingCode={activeTrackingCode}
        incomingCount={incomingCount}
        deliveredCount={deliveredCount}
        onSelectActive={setActiveTrackingCode}
        onRemove={removeDelivery}
        onCopy={handleCopy}
        onOpenReschedule={handleOpenReschedule}
        onOpenPod={handleOpenPod}
      />
    </div>
  );
}
