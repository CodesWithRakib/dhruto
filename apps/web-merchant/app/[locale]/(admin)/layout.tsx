import React from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/** Admin supervision surface — the shared dashboard shell, admin nav. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell section="admin">{children}</DashboardShell>;
}
