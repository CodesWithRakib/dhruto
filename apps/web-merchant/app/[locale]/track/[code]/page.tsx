import React from "react";
import { PublicTrackingView } from "../../../../features/tracking/components/public-tracking-view";

export const metadata = {
  title: "Shipment Tracking — Dhruto Express",
  description: "View real-time delivery milestones and location of your parcel.",
};

export default async function TrackCodePage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code } = await params;

  return <PublicTrackingView initialCode={code} />;
}
