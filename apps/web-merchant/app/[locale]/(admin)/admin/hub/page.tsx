import React from "react";
import type { Metadata } from "next";
import { HubDashboardView } from "@/features/hubs/components/hub-dashboard-view";

export const metadata: Metadata = {
  title: "Hub Operations — Admin",
  description: "Sorting, bagging, manifests and hub inventory.",
};

export default function AdminHubPage() {
  return <HubDashboardView />;
}
