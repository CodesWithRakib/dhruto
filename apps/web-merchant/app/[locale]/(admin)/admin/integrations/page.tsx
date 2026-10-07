import React from "react";
import type { Metadata } from "next";
import { AdminIntegrationsDashboard } from "@/features/integrations/components/admin-integrations-dashboard";

export const metadata: Metadata = {
  title: "Integrations & Queue Health — Admin",
  description: "SMS/email providers, webhook failures, queue health, dead-letter and outbox.",
  robots: { index: false, follow: false },
};

export default function AdminIntegrationsPage() {
  return <AdminIntegrationsDashboard />;
}
