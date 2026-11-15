import React from "react";
import type { Metadata } from "next";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata: Metadata = {
  title: "Notifications | Dhruto Express",
  description: "Parcel updates, financial settlements, and operational delivery status alerts.",
  robots: { index: false, follow: false },
};

export default function MerchantNotificationsPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-8 py-2 pb-20 sm:pb-8">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Main Notifications Cockpit */}
      <div className="relative z-10 space-y-8">
        <NotificationCenter />
        <div className="w-full">
          <NotificationPreferences />
        </div>
      </div>
    </div>
  );
}
