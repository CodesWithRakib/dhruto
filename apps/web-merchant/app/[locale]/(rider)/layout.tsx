import React from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/** Rider surface — the shared dashboard shell, rider nav (mobile-first). */
export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell section="rider">{children}</DashboardShell>;
}
