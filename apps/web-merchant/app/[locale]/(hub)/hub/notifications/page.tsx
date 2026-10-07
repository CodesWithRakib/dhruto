import React from "react";
import type { Metadata } from "next";
import { NotificationCenter } from "@/features/notifications/components/notification-center";

export const metadata: Metadata = {
  title: "Notifications — Hub",
  description: "Dispatch alerts, manifest receipts and cash desk updates.",
  robots: { index: false, follow: false },
};

export default function HubNotificationsPage() {
  return (
    <div className="pb-20 sm:pb-6">
      <NotificationCenter />
    </div>
  );
}
