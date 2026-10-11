import React from "react";
import { PageHeader } from "@/components/page-header";
import { MerchantSettingsView } from "@/features/merchants/components/merchant-settings-view";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Merchant Profile & Settings | Dhruto Merchant",
  description: "Manage business profile, contact numbers, and default pickup address.",
};

export default function MerchantSettingsPage() {
  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader
        title="Profile & Settings"
        description="Update your business information, pickup address, and manage developer preferences."
      />
      <MerchantSettingsView />
    </div>
  );
}
