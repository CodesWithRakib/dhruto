import React from "react";
import { CustomerTrackingView } from "@/features/customer/components/customer-tracking-view";

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export const metadata = {
  title: "Shipment Tracking | Customer Portal | Dhruto",
  description: "Live package status, courier timeline, and expected delivery time.",
};

export default async function CustomerTrackCodePage({ params }: PageProps) {
  const { code } = await params;
  return <CustomerTrackingView initialCode={code} />;
}
