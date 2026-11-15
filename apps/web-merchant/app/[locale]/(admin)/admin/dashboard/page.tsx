import React from "react";
import type { Metadata } from "next";
import { AdminConsole } from "@/features/admin/components/admin-console";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";

export const metadata: Metadata = {
  title: "Operations Console",
  description: "Supervise parcels, finance, hubs and riders from one console.",
};

export default function AdminDashboardPage() {
  return (
    <div className="relative min-h-screen">
      <DashboardCanvasBg />
      <AdminConsole />
    </div>
  );
}
