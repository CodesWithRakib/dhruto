import React from "react";
import type { Metadata } from "next";
import { ParcelList } from "@/features/parcels/components/parcel-list";

export const metadata: Metadata = {
  title: "Parcels — Admin",
  description: "Review parcel operations across the network.",
};

export default function AdminParcelsPage() {
  return <ParcelList />;
}
