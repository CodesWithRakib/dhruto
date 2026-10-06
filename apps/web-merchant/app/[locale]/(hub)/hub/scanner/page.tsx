import React from "react";
import { HubScannerPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Hub Scanner | Dhruto",
  description: "Continuous parcel and bag scanning for hub operators.",
};

export default function HubScannerRoutePage() {
  return <HubScannerPage />;
}
