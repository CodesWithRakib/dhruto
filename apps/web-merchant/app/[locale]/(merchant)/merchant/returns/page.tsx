import React from "react";
import { ReturnsListView } from "@/features/parcels/components/returns-list-view";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Returns & RTO Operations | Dhruto",
  description: "Monitor and manage returned parcels, failed delivery legs, and warehouse restocking.",
};

export default function MerchantReturnsPage() {
  return (
    <div className="w-full space-y-6">
      <ReturnsListView />
    </div>
  );
}
