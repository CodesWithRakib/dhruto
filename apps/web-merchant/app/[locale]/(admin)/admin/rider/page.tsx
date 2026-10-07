import React from "react";
import type { Metadata } from "next";
import { FleetRidersView } from "@/features/riders/components/fleet-views";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Rider Operations — Admin",
  description: "Fleet visibility, live task counts and assignment audit.",
};

export default function AdminRiderPage() {
  return (
    <div className="w-full px-4 py-6">
      <FleetRidersView />
    </div>
  );
}
