import React from "react";
import type { Metadata } from "next";
import { AdminIntelligenceDashboard } from "@/features/intelligence/components/admin-intelligence-dashboard";

export const metadata: Metadata = {
  title: "Intelligence Operations — Admin",
  description: "Geography dataset, scoring models, prediction metrics and override review.",
  robots: { index: false, follow: false },
};

export default function AdminIntelligencePage() {
  return <AdminIntelligenceDashboard />;
}
