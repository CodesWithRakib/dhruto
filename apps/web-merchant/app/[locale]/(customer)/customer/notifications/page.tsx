import React from "react";
import type { Metadata } from "next";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";

export const metadata: Metadata = {
  title: "Notifications — Customer",
  description: "Updates about parcels on their way to you.",
  robots: { index: false, follow: false },
};

export default function CustomerNotificationsPage() {
  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      <NotificationCenter />
      <div className="w-full px-4 sm:px-6">
        <NotificationPreferences />
      </div>
    </div>
  );
}
