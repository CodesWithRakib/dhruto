import React from "react";
import { RiderHistoryPage } from "@/features/riders/components/rider-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Delivery History | Dhruto Rider",
  description: "Completed and failed deliveries.",
};

export default function RiderHistoryRoutePage() {
  return <RiderHistoryPage />;
}
