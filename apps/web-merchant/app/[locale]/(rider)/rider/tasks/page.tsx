import React from "react";
import { RiderTasksPage } from "@/features/riders/components/rider-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Delivery Tasks | Dhruto Rider",
  description: "Parcels assigned for last-mile delivery.",
};

export default function RiderTasksRoutePage() {
  return <RiderTasksPage />;
}
