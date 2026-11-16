import React from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { MerchantSettingsView } from "@/features/merchants/components/merchant-settings-view";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Merchant Profile & Settings | Dhruto Express",
  description: "Manage business profile, contact numbers, and default pickup address.",
};

export default async function MerchantSettingsPage() {
  const t = await getTranslations("Settings");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-6 py-2 pb-8">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Main Settings Cockpit */}
      <div className="relative z-10 w-full space-y-6">
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
        />
        <MerchantSettingsView />
      </div>
    </div>
  );
}
