import React from "react";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";

export const metadata = {
  title: "Track Shipment — Dhruto Express",
  description: "Track your parcel delivery progress across Bangladesh with live status updates.",
};

export default function TrackSearchPage() {
  return <PublicTrackingView />;
}
