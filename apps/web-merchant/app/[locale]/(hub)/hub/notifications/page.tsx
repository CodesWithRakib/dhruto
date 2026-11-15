import React from "react";
import type { Metadata } from "next";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata: Metadata = {
  title: "Notifications — Hub",
  description: "Dispatch alerts, manifest receipts and cash desk updates.",
  robots: { index: false, follow: false },
};

export default function HubNotificationsPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      <DashboardCanvasBg />
      <div className="relative z-10 space-y-6 pb-20 sm:pb-6">
        <NotificationCenter />
        <div className="w-full px-4 sm:px-6">
          <NotificationPreferences />
        </div>
      </div>
    </div>
  );
}
