import React from "react";
import type { Metadata } from "next";
import { HubOperationsView } from "@/features/hubs/components/hub-operations-view";

export const metadata: Metadata = {
  title: "Hub Operations — Admin",
  description: "Sorting, bagging, manifests and hub inventory.",
};

export default function AdminHubPage() {
  return <HubOperationsView />;
}
