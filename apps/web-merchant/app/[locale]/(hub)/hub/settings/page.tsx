import React from "react";
import { PageHeader } from "@/components/page-header";
import { HubSettingsView } from "@/features/hubs/components/hub-settings-view";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Hub Station Profile & Settings | Dhruto Hub",
  description: "Station details, operator profile, and logistics workflows.",
};

export default function HubSettingsPage() {
  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader
        title="Station Profile & Settings"
        description="Assigned sorting hub station, operator credentials, and operations shortcuts."
      />
      <HubSettingsView />
    </div>
  );
}
