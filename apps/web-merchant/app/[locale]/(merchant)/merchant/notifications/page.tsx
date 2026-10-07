import React from "react";
import type { Metadata } from "next";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Parcel updates, financial alerts and delivery status.",
  robots: { index: false, follow: false },
};

export default function MerchantNotificationsPage() {
  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      <NotificationCenter />
      <div className="w-full px-4 sm:px-6">
        <NotificationPreferences />
      </div>
    </div>
  );
}
