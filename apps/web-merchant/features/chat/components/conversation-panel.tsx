"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useStore } from "react-redux";
import { Button, Sheet, SheetContent, SheetTitle } from "@dhruto/ui";
import { ChatConversationType, type ChatPageSender } from "@dhruto/contracts";
import type { RootState } from "@/store";
import { Link } from "@/lib/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useMediaQuery } from "@/hooks/use-media-query";
import { NotFoundState } from "@/components/feedback/states";
import { useGetConversationQuery, useGetPinsQuery } from "../api/chat.api";
import { useConversationTimeline } from "../hooks/use-conversation-timeline";
import { useMessageActions } from "../hooks/use-message-actions";
import { useReadReceipts } from "../hooks/use-read-receipts";
import { useSendMessage } from "../hooks/use-send-message";
import { useTypingEmitter } from "../hooks/use-typing-emitter";
import { useConversationRoom } from "../realtime/use-conversation-room";
import { conversationTitleWithParticipants, senderName } from "../lib/display";
import { conversationCaps, NO_CAPS } from "../lib/permissions";
import { compareSequence, type TimelineMessage } from "../lib/timeline";
import { type MessengerRoutes, type MessengerSection } from "../lib/routes";
import { ParcelContextBar } from "./parcel-context-bar";
import {
  cursorsSeeded,
  findByMessageId,
  latestSequence,
  type ParticipantCursor,
} from "../state/chat-timeline.slice";
import { TypingIndicator } from "./chat-primitives";
import { ConversationInfoPanel } from "./conversation-info-panel";
import { MessageComposer, type ComposerReply } from "./message-composer";
import { type MessageBubbleHandlers } from "./message-bubble";
import { MessageTimeline } from "./message-timeline";
import { ConversationPanelHeader } from "./conversation-panel-header";
import { ConversationPanelDialogs } from "./conversation-panel-dialogs";

const MAX_JUMP_PAGES = 10;
const EMPTY_SENDERS: Record<string, ChatPageSender> = {};
const EMPTY_CURSORS: Record<string, ParticipantCursor> = {};
const HIGHLIGHT_MS = 3000;

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error.status === 404 || error.status === 403 || error.status === 400)
  );
}

export function ConversationPanel({
  conversationId,
  myUserId,
  routes,
  section,
  infoOpen,
  onInfoOpenChange,
}: {
  conversationId: string;
  myUserId: string;
  routes: MessengerRoutes;
  section: MessengerSection;
  infoOpen: boolean;
  onInfoOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Chat");
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const searchParams = useSearchParams();
  const isWide = useMediaQuery("(min-width: 1280px)");

  const detailQuery = useGetConversationQuery(conversationId);
  const detail = detailQuery.data;
  const pinsQuery = useGetPinsQuery(conversationId, { skip: !detail });
  const view = useConversationTimeline(conversationId);
  const timeline = useAppSelector((state) => state.chatTimeline.conversations[conversationId]);

  useConversationRoom(detail ? conversationId : null, myUserId);

  useEffect(() => {
    if (detail) dispatch(cursorsSeeded({ conversationId, participants: detail.participants }));
  }, [detail, conversationId, dispatch]);

  const caps = useMemo(
    () => (detail ? conversationCaps(detail.status, detail.myParticipation.capabilities) : NO_CAPS),
    [detail],
  );
  const senders = timeline?.senders ?? EMPTY_SENDERS;
  const cursors = timeline?.cursors ?? EMPTY_CURSORS;
  const pinnedIds = useMemo(() => new Set((pinsQuery.data ?? []).map((pin) => pin.messageId)), [pinsQuery.data]);
  const messagesById = useMemo(() => {
    const map = new Map<string, TimelineMessage>();
    for (const message of view.messages) if (message.id) map.set(message.id, message);
    return map;
  }, [view.messages]);

  const [atBottom, setAtBottom] = useState(true);
  useReadReceipts({
    conversationId,
    myUserId,
    latestSequence: latestSequence(timeline),
    initialRead: detail?.myParticipation.lastReadSequence ?? null,
    initialDelivered: detail?.myParticipation.lastDeliveredSequence ?? null,
    atBottom: atBottom && view.initialized,
  });

  const { send, retry, discard } = useSendMessage(conversationId, myUserId);
  const typingEmitter = useTypingEmitter(conversationId);
  const [reply, setReply] = useState<ComposerReply | null>(null);

  const actions = useMessageActions(conversationId);
  const [editing, setEditing] = useState<TimelineMessage | null>(null);
  const [deleting, setDeleting] = useState<TimelineMessage | null>(null);
  const [removing, setRemoving] = useState<TimelineMessage | null>(null);
  const [reporting, setReporting] = useState<TimelineMessage | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((messageId: string) => {
    setHighlight(messageId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  }, []);
  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  const jumpTo = useCallback(
    async (messageId: string, sequence?: string | null) => {
      const loaded = () => findByMessageId(store.getState().chatTimeline.conversations[conversationId], messageId);
      for (let page = 0; page < MAX_JUMP_PAGES && !loaded(); page += 1) {
        const oldest = store.getState().chatTimeline.conversations[conversationId]?.oldestSequence ?? null;
        if (sequence && oldest && compareSequence(sequence, oldest) >= 0) break;
        if (!(await view.loadOlder())) break;
      }
      if (loaded()) flash(messageId);
      else toast.info(t("messageTooOld"));
    },
    [conversationId, flash, store, t, view],
  );

  const targetMessage = searchParams.get("m");
  const targetSequence = searchParams.get("seq");
  useEffect(() => {
    if (!targetMessage || !view.initialized) return;
    void jumpTo(targetMessage, targetSequence);
  }, [targetMessage, targetSequence, view.initialized, jumpTo]);

  const nameOf = useCallback(
    (userId: string | null) => senderName(senders, userId, myUserId, t),
    [senders, myUserId, t],
  );

  const handlers: MessageBubbleHandlers = useMemo(
    () => ({
      onReply: (message) =>
        message.id &&
        setReply({
          messageId: message.id,
          name: nameOf(message.senderId),
          preview: message.deletedAt ? null : message.content,
        }),
      onEdit: setEditing,
      onDelete: setDeleting,
      onRemove: setRemoving,
      onReport: setReporting,
      onTogglePin: (message, pinned) => {
        if (message.id) void (pinned ? actions.unpin(message.id) : actions.pin(message.id));
      },
      onToggleReaction: (message, reaction) => void actions.toggleReaction(message, reaction),
      onRetry: (message) => message.clientMessageId && void retry(message.clientMessageId),
      onDiscard: (message) => message.clientMessageId && discard(message.clientMessageId),
      onJumpTo: (messageId) => void jumpTo(messageId),
    }),
    [actions, discard, jumpTo, nameOf, retry],
  );

  if (detailQuery.isError && isNotFound(detailQuery.error)) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <NotFoundState
          title={t("conversationUnavailable")}
          description={t("conversationUnavailableDescription")}
          action={
            <Button asChild variant="outline">
              <Link href={routes.list}>{t("backToList")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const title = detail
    ? conversationTitleWithParticipants(detail, detail.participants, myUserId, t)
    : "";
  const other =
    detail?.type === ChatConversationType.DIRECT
      ? detail.participants.find((participant) => participant.userId !== myUserId)
      : undefined;
  const disabledReason = !detail
    ? t("connection.connecting")
    : !caps.writable
      ? t("readOnly", { status: t(`statuses.${detail.status}`) })
      : !caps.canSend
        ? t("errors.forbidden")
        : null;

  const info = detail ? (
    <ConversationInfoPanel
      detail={detail}
      title={title}
      pins={pinsQuery.data ?? []}
      messagesById={messagesById}
      myUserId={myUserId}
      onJumpTo={(messageId) => {
        if (!isWide) onInfoOpenChange(false);
        void jumpTo(messageId);
      }}
    />
  ) : null;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationPanelHeader
          routes={routes}
          title={title}
          typeLabel={detail ? t(`types.${detail.type}`) : ""}
          participantCount={detail?.participants.length ?? 0}
          otherUserId={other?.userId ?? null}
          hasDetail={Boolean(detail)}
          infoOpen={infoOpen}
          onInfoOpenChange={onInfoOpenChange}
        />
        {detail?.parcel && <ParcelContextBar parcel={detail.parcel} section={section} />}

        <MessageTimeline
          key={conversationId}
          messages={view.messages}
          initialized={view.initialized}
          hasMoreOlder={view.hasMoreOlder}
          loadingOlder={view.loadingOlder}
          error={view.error}
          onRetry={view.retry}
          onLoadOlder={view.loadOlder}
          myUserId={myUserId}
          senders={senders}
          cursors={cursors}
          pinnedIds={pinnedIds}
          showSenderNames={(detail?.participants.length ?? 0) > 2}
          caps={caps}
          handlers={handlers}
          highlightMessageId={highlight}
          onAtBottomChange={setAtBottom}
        />

        <TypingIndicator conversationId={conversationId} nameOf={(userId) => nameOf(userId)} />

        <MessageComposer
          resetKey={conversationId}
          conversationId={conversationId}
          disabledReason={disabledReason}
          reply={reply}
          onCancelReply={() => setReply(null)}
          onSend={(content, replyTo, media) => {
            setReply(null);
            void send(content, replyTo, media);
          }}
          onTyping={typingEmitter.onInput}
          onStopTyping={typingEmitter.stop}
        />
      </div>

      {infoOpen && isWide && info && (
        <aside className="hidden w-80 shrink-0 xl:block" aria-label={t("info")}>
          {info}
        </aside>
      )}
      {!isWide && (
        <Sheet open={infoOpen && Boolean(info)} onOpenChange={onInfoOpenChange}>
          <SheetContent side="right" closeLabel={t("closeInfo")} className="w-full p-0 sm:max-w-sm">
            <SheetTitle className="sr-only">{t("info")}</SheetTitle>
            {info}
          </SheetContent>
        </Sheet>
      )}

      <ConversationPanelDialogs
        editing={editing}
        setEditing={setEditing}
        deleting={deleting}
        setDeleting={setDeleting}
        removing={removing}
        setRemoving={setRemoving}
        reporting={reporting}
        setReporting={setReporting}
        actions={actions}
      />
    </div>
  );
}
