import React from "react";
import { HubExceptionsPage } from "@/features/hubs/components/hub-pages";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Operational Exceptions | Dhruto Hub",
  description: "Review and resolve hub operational exceptions.",
};

export default function HubExceptionsRoutePage() {
  return <HubExceptionsPage />;
}
