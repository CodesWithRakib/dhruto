import React from "react";
import { RiderTaskDetailsPage } from "@/features/riders/components/rider-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Delivery Task | Dhruto Rider",
  description: "Customer handoff: OTP, COD collection and proof of delivery.",
};

export default async function RiderTaskDetailsRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RiderTaskDetailsPage parcelId={id} />;
}
