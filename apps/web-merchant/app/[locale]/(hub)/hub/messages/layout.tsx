import React from "react";
import type { Metadata } from "next";
import { MessengerLayout } from "@/features/chat/components/messenger";

export const metadata: Metadata = {
  title: "Messages | Dhruto Express",
  robots: { index: false, follow: false },
};

/**
 * The messenger lives in the layout so it persists across /messages and
 * /messages/[conversationId] navigation (single socket, warm caches). The
 * selected conversation is read from the URL params by the messenger.
 */
export default function HubMessagesLayout({ children }: { children: React.ReactNode }) {
  return <MessengerLayout section="hub">{children}</MessengerLayout>;
}
