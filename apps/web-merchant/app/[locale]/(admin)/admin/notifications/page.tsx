import React from "react";
import type { Metadata } from "next";
import { NotificationCenter } from "@/features/notifications/components/notification-center";

export const metadata: Metadata = {
  title: "Notifications — Admin",
  description: "Platform alerts and operational notifications.",
  robots: { index: false, follow: false },
};

export default function AdminNotificationsPage() {
  return <NotificationCenter />;
}
