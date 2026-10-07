import React from "react";
import type { Metadata } from "next";
import {
  AdminSectionDashboard,
  type AnalyticsSection,
} from "@/features/analytics/components/admin-section-dashboard";

const TITLES: Record<string, string> = {
  parcels: "Parcel Analytics",
  delivery: "Delivery Analytics",
  hubs: "Hub Analytics",
  riders: "Rider Analytics",
  merchants: "Merchant Comparison",
  rto: "RTO Analytics",
  cod: "COD Analytics",
  finance: "Financial Analytics",
  notifications: "Notification & Webhook Analytics",
  intelligence: "Intelligence Analytics",
  alerts: "Operational Alerts",
  reports: "Reports & Exports",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return {
    title: `${TITLES[section] ?? "Analytics"} — Admin`,
    description: "Operational analytics section.",
    robots: { index: false, follow: false },
  };
}

export default async function AdminAnalyticsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return <AdminSectionDashboard section={section as AnalyticsSection} />;
}
