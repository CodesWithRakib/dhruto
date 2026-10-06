import React from "react";
import { HubDashboardView } from "@/features/hubs/components/hub-dashboard-view";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Hub Dashboard | Dhruto",
  description: "Live hub operations position: inbound, bags, manifests and exceptions.",
};

export default function HubDashboardPage() {
  return <HubDashboardView />;
}
