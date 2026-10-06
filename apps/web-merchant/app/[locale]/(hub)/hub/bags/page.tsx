import React from "react";
import { HubBagsPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Transit Bags | Dhruto Hub",
  description: "Group parcels into sealed transit bags per destination hub.",
};

export default function HubBagsRoutePage() {
  return <HubBagsPage />;
}
