import React from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/** Hub manager surface — the shared dashboard shell, hub nav. */
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell section="hub">{children}</DashboardShell>;
}
