import React from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { HubSettingsView } from "@/features/hubs/components/hub-settings-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Hub Station Profile & Settings | Dhruto Hub",
  description: "Station details, operator profile, and logistics workflows.",
};

export default async function HubSettingsPage() {
  const t = await getTranslations("Hub.settings");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      <DashboardCanvasBg />
      <div className="relative z-10 w-full space-y-6 pb-6">
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
        />
        <HubSettingsView />
      </div>
    </div>
  );
}
