import React from "react";
import { HubManifestDetailsPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Manifest Details | Dhruto Hub",
  description: "Dispatch, receive and reconcile a line-haul manifest.",
};

export default async function HubManifestDetailsRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HubManifestDetailsPage manifestId={id} />;
}
