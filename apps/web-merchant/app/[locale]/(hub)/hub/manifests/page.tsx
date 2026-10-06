import React from "react";
import { HubManifestsPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Dispatch Manifests | Dhruto Hub",
  description: "Vehicle line-haul manifests between hubs.",
};

export default function HubManifestsRoutePage() {
  return <HubManifestsPage />;
}
