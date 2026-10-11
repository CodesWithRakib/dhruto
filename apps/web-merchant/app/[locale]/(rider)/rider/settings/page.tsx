import React from "react";
import { RiderProfilePage } from "@/features/riders/components/rider-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Rider Profile & Settings | Dhruto Rider",
  description: "Rider code, hub, duty state and cash hand-in.",
};

export default function RiderSettingsPage() {
  return <RiderProfilePage />;
}
