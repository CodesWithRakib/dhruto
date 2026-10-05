import React from "react";
import type { Metadata } from "next";
import { RiderDashboard } from "@/features/riders/components/rider-dashboard";

export const metadata: Metadata = {
  title: "Rider Operations — Admin",
  description: "Last-mile task queues, OTP verification and cash collection.",
};

export default function AdminRiderPage() {
  return <RiderDashboard />;
}
