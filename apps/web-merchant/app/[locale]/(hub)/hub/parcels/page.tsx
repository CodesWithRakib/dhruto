import React from "react";
import { HubParcelsPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Parcel Lookup | Dhruto Hub",
  description: "Look up parcels by tracking code and browse hub inventory.",
};

export default function HubParcelsRoutePage() {
  return <HubParcelsPage />;
}
