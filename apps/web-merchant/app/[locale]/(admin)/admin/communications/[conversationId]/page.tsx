import React from "react";
import type { Metadata } from "next";
import { ConversationWorkspace } from "@/features/chat-admin/components/workspace/conversation-workspace";

export const metadata: Metadata = {
  title: "Conversation workspace — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCommunicationWorkspacePage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ConversationWorkspace conversationId={conversationId} />;
}
