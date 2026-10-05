import React from "react";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/** Authenticated surfaces are never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Merchant application surface — the shared dashboard shell, merchant nav. */
export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell section="merchant">{children}</DashboardShell>;
}
