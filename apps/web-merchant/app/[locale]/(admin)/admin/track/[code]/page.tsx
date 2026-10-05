import React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";

export const metadata = {
  title: "Shipment Tracking — Admin Operations",
  description: "View real-time delivery milestones and rider dispatch location.",
};

export default async function AdminTrackCodePage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code } = await params;

  return (
    <div className="w-full">
      <PublicTrackingView initialCode={code} />
    </div>
  );
}
