import React from "react";
import { CustomerSettingsView } from "@/features/customer/components/customer-settings-view";

export const metadata = {
  title: "Delivery Settings | Customer Portal | Dhruto",
  description: "Manage saved delivery destinations, contact numbers, and alert channels.",
};

export default function CustomerSettingsPage() {
  return <CustomerSettingsView />;
}
