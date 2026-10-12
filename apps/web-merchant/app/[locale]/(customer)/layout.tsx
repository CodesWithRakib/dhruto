import React from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Customer portal surface — dedicated dashboard shell with customer navigation,
 * delivery tracking, handoff OTPs, and delivery instructions.
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell section="customer">{children}</DashboardShell>;
}
