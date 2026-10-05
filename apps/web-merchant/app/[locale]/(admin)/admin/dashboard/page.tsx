import React from "react";
import type { Metadata } from "next";
import { AdminConsole } from "@/features/admin/components/admin-console";

export const metadata: Metadata = {
  title: "Operations Console",
  description: "Supervise parcels, finance, hubs and riders from one console.",
};

export default function AdminDashboardPage() {
  return <AdminConsole />;
}
