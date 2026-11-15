"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { type ChatMessageItem, type ChatReportReason } from "@dhruto/contracts";
import { useAppDispatch } from "@/store/hooks";
import {
  useAddReactionMutation,
  useDeleteMessageMutation,
  useEditMessageMutation,
  usePinMessageMutation,
  useRemoveMessageMutation,
  useRemoveReactionMutation,
  useReportMessageMutation,
  useUnpinMessageMutation,
} from "../api/chat.api";
import { chatErrorKey } from "../lib/errors";
import { type TimelineMessage } from "../lib/timeline";
import { messageReceived } from "../state/chat-timeline.slice";

export interface MessageActions {
  edit: (messageId: string, content: string) => Promise<boolean>;
  deleteOwn: (messageId: string) => Promise<boolean>;
  removeAsModerator: (messageId: string, reason: string) => Promise<boolean>;
  toggleReaction: (message: TimelineMessage, reaction: string) => Promise<boolean>;
  pin: (messageId: string) => Promise<boolean>;
  unpin: (messageId: string) => Promise<boolean>;
  report: (messageId: string, reason: ChatReportReason, details?: string) => Promise<boolean>;
}

/**
 * Message mutations. No optimistic UI here (rollback for edits, deletions and
 * reaction counts is not reliably safe); each canonical response is merged
 * into the timeline, and failures show a localized toast. The backend
 * re-checks every permission — the UI only hides what the user cannot do.
 */
export function useMessageActions(conversationId: string): MessageActions {
  const t = useTranslations("Chat");
  const dispatch = useAppDispatch();
  const [editMutation] = useEditMessageMutation();
  const [deleteMutation] = useDeleteMessageMutation();
  const [removeMutation] = useRemoveMessageMutation();
  const [addReactionMutation] = useAddReactionMutation();
  const [removeReactionMutation] = useRemoveReactionMutation();
  const [pinMutation] = usePinMessageMutation();
  const [unpinMutation] = useUnpinMessageMutation();
  const [reportMutation] = useReportMessageMutation();

  return useMemo(() => {
    const fail = (error: unknown) => {
      toast.error(t(`errors.${chatErrorKey(error)}`));
      return false;
    };
    const merge = async (request: Promise<ChatMessageItem>) => {
      try {
        dispatch(messageReceived({ message: await request }));
        return true;
      } catch (error) {
        return fail(error);
      }
    };
    return {
      edit: (messageId, content) => merge(editMutation({ messageId, content }).unwrap()),
      deleteOwn: (messageId) => merge(deleteMutation(messageId).unwrap()),
      removeAsModerator: (messageId, reason) => merge(removeMutation({ messageId, reason }).unwrap()),
      toggleReaction: (message, reaction) => {
        if (!message.id) return Promise.resolve(false);
        const mine = message.reactions.find((r) => r.reaction === reaction)?.reactedByMe === true;
        return merge(
          mine
            ? removeReactionMutation({ messageId: message.id, reaction }).unwrap()
            : addReactionMutation({ messageId: message.id, reaction }).unwrap(),
        );
      },
      pin: async (messageId) => {
        try {
          await pinMutation({ conversationId, messageId }).unwrap();
          return true;
        } catch (error) {
          return fail(error);
        }
      },
      unpin: async (messageId) => {
        try {
          await unpinMutation({ conversationId, messageId }).unwrap();
          return true;
        } catch (error) {
          return fail(error);
        }
      },
      report: async (messageId, reason, details) => {
        try {
          await reportMutation({ messageId, reason, details }).unwrap();
          toast.success(t("reportSent"));
          return true;
        } catch (error) {
          return fail(error);
        }
      },
    } satisfies MessageActions;
  }, [
    t,
    dispatch,
    conversationId,
    editMutation,
    deleteMutation,
    removeMutation,
    addReactionMutation,
    removeReactionMutation,
    pinMutation,
    unpinMutation,
    reportMutation,
  ]);
}
