import React, { Suspense } from "react";
import type { Metadata } from "next";
import { CommunicationCenter } from "@/features/chat-admin/components/communication-center";

export const metadata: Metadata = {
  title: "Communication Center — Admin",
  description: "Operational inbox, escalations, reports, attachment security and audit.",
  robots: { index: false, follow: false },
};

/** Phase 7 Admin Communication Center. Data and permissions load client-side. */
export default function AdminCommunicationsPage() {
  return (
    <Suspense>
      <CommunicationCenter />
    </Suspense>
  );
}
