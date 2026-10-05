import React from "react";
import { ParcelList } from "@/features/parcels/components/parcel-list";

export const metadata = {
  robots: { index: false, follow: false },
  title: "My Parcels | Dhruto",
  description: "View and manage your parcel bookings.",
};

export default function ParcelsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <ParcelList />
    </div>
  );
}
