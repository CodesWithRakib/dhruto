import React from "react";
import { HubPickupsPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Merchant Pickups | Dhruto Hub",
  description: "Assign pickup riders to merchant pickup requests in this hub's district.",
};

export default function HubPickupsRoutePage() {
  return <HubPickupsPage />;
}
