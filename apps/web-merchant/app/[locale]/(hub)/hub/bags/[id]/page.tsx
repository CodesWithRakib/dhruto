import React from "react";
import { HubBagDetailsPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Bag Details | Dhruto Hub",
  description: "Bag membership, parcel intake and sealing.",
};

export default async function HubBagDetailsRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HubBagDetailsPage bagId={id} />;
}
