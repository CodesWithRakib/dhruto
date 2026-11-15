import React from "react";
import { PageHeader } from "@/components/page-header";
import { HubSettingsView } from "@/features/hubs/components/hub-settings-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Hub Station Profile & Settings | Dhruto Hub",
  description: "Station details, operator profile, and logistics workflows.",
};

export default function HubSettingsPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      <DashboardCanvasBg />
      <div className="relative z-10 w-full space-y-6 pb-6">
        <PageHeader
          title="Station Profile & Settings"
          description="Assigned sorting hub station, operator credentials, and operations shortcuts."
        />
        <HubSettingsView />
      </div>
    </div>
  );
}
