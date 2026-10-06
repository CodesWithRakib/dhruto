import React from "react";
import { HubCashDesk } from "@/features/finance/components/hub-cash-desk";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Hub Cash Desk | Dhruto Hub",
  description: "Verify rider cash hand-ins and review discrepancies.",
};

export default function HubCashRoutePage() {
  return <HubCashDesk />;
}
