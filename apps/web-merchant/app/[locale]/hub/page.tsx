import React from "react";
import { HubOperationsView } from "../../../features/hubs/components/hub-operations-view";

export const metadata = {
  title: "Hub Operations Terminal | Dhruto Express",
  description: "Terminal sorting, bag consolidation, vehicle manifests, and hub inventory operations.",
};

export default function HubPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6 px-4">
      <HubOperationsView />
    </div>
  );
}
