"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pin } from "lucide-react";
import { type ChatConversationDetail, type ChatPinItem } from "@dhruto/contracts";
import { useAppSelector } from "@/store/hooks";
import { formatClock, formatDayLabel } from "../lib/display";
import { type TimelineMessage } from "../lib/timeline";
import { ChatAvatar } from "./chat-primitives";

/**
 * Conversation details from existing APIs only: type, status, active
 * participants (name, platform role, conversation role, presence when the
 * backend made it visible) and pinned messages. Internal notes and
 * moderation data are never shown here.
 */
export function ConversationInfoPanel({
  detail,
  title,
  pins,
  messagesById,
  myUserId,
  onJumpTo,
}: {
  detail: ChatConversationDetail;
  title: string;
  pins: ChatPinItem[];
  messagesById: ReadonlyMap<string, TimelineMessage>;
  myUserId: string;
  onJumpTo: (messageId: string) => void;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const presence = useAppSelector((state) => state.chatEphemeral.presence);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col items-center gap-2 border-b border-border px-4 py-6 text-center">
        <ChatAvatar name={title} />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <dl className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <dt>{t("type")}:</dt>
            <dd className="font-medium text-foreground">{t(`types.${detail.type}`)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t("status")}:</dt>
            <dd className="font-medium capitalize text-foreground">{t(`statuses.${detail.status}`)}</dd>
          </div>
        </dl>
      </div>

      <section className="border-b border-border px-4 py-4" aria-labelledby="chat-info-participants">
        <h3 id="chat-info-participants" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("participants")} ({detail.participants.length})
        </h3>
        <ul className="space-y-2">
          {detail.participants.map((participant) => {
            const info = presence[participant.userId];
            return (
              <li key={participant.userId} className="flex items-center gap-3">
                <ChatAvatar name={participant.displayName} size="sm" online={info ? info.status === "online" : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {participant.userId === myUserId ? `${participant.displayName} (${t("you")})` : participant.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t(`platformRoles.${participant.platformRole}`)} · {t(`participantRoles.${participant.role}`)}
                    {info?.status === "offline" && info.lastSeenAt
                      ? ` · ${t("lastSeen", { time: `${formatDayLabel(info.lastSeenAt, locale, t)} ${formatClock(info.lastSeenAt, locale)}` })}`
                      : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="px-4 py-4" aria-labelledby="chat-info-pins">
        <h3 id="chat-info-pins" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("pinnedMessages")}
        </h3>
        {pins.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPins")}</p>
        ) : (
          <ul className="space-y-1">
            {pins.map((pin) => {
              const message = messagesById.get(pin.messageId);
              return (
                <li key={pin.messageId}>
                  <button
                    type="button"
                    onClick={() => onJumpTo(pin.messageId)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="line-clamp-2 text-foreground">
                      {message ? (message.deletedAt ? t("deletedMessage") : message.content) : formatDayLabel(pin.pinnedAt, locale, t)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
