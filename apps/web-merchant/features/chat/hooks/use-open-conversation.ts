"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChatConversationType, type CreateChatConversationRequest } from "@dhruto/contracts";
import { useRouter } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { useOpenConversationMutation } from "../api/chat.api";
import { chatErrorKey } from "../lib/errors";
import { messengerRoutes, sectionForRole } from "../lib/routes";

/** The backend-defined context a conversation is opened for. */
export type ConversationTarget =
  | { kind: "parcel"; parcelId: string }
  | { kind: "merchantDesk"; merchantId?: string };

export type OpenOutcome = "opened" | "needsReason" | "failed";

/**
 * Contextual chat entry (Phase 5): asks the backend to get-or-create the
 * conversation for a parcel / merchant desk, then navigates to it in the
 * role's messenger. No conversation ids are guessed or hardcoded, no
 * recipients are chosen on the client, and the request only runs on an
 * explicit action (never on render). Staff joining an existing thread get
 * `needsReason` and must retry with a reason (audited server-side).
 */
export function useOpenConversation() {
  const t = useTranslations("Chat");
  const router = useRouter();
  const role = useAppSelector((state) => state.auth.user?.role ?? null);
  const [openMutation] = useOpenConversationMutation();
  const [pending, setPending] = useState(false);

  const open = useCallback(
    async (target: ConversationTarget, reason?: string): Promise<OpenOutcome> => {
      const section = sectionForRole(role);
      if (!section || pending) return "failed";
      setPending(true);
      try {
        const body: CreateChatConversationRequest =
          target.kind === "parcel"
            ? { type: ChatConversationType.PARCEL_DELIVERY, parcelId: target.parcelId, ...(reason ? { reason } : {}) }
            : {
                type: ChatConversationType.MERCHANT_DESK,
                ...(target.merchantId ? { merchantId: target.merchantId } : {}),
                ...(reason ? { reason } : {}),
              };
        const conversation = await openMutation(body).unwrap();
        router.push(messengerRoutes(section).thread(conversation.id));
        return "opened";
      } catch (error) {
        const key = chatErrorKey(error);
        if (key === "reasonRequired") return "needsReason";
        toast.error(t(`errors.${key}`));
        return "failed";
      } finally {
        setPending(false);
      }
    },
    [openMutation, pending, role, router, t],
  );

  return { open, pending };
}
