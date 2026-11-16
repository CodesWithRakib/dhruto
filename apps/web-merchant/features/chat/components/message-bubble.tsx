"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Pin, RotateCcw, Zap } from "lucide-react";
import { Button, cn } from "@dhruto/ui";
import { ChatMessageType } from "@dhruto/contracts";
import { formatClock } from "../lib/display";
import { type TimelineMessage } from "../lib/timeline";
import { messagePermissions } from "../lib/permissions";
import { DeliveryStatus } from "./chat-primitives";
import { MessageAttachments } from "./message-attachments";
import {
  MessageActionsMenu,
  ReactionRow,
  SystemRow,
  QUICK_REACTIONS,
} from "./message-bubble-actions";
import {
  type MessageBubbleHandlers,
  type MessageBubbleProps,
} from "./message-bubble-types";

export { QUICK_REACTIONS };
export type { MessageBubbleHandlers, MessageBubbleProps };

function MessageBody({ message }: { message: TimelineMessage }) {
  const t = useTranslations("Chat");
  if (message.deletedAt) {
    return <p className="italic opacity-80">{t("deletedMessage")}</p>;
  }
  const metadata = message.metadata;
  return (
    <>
      {message.type === ChatMessageType.LOCATION && metadata && "latitude" in metadata && (
        <p className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {metadata.label ?? `${metadata.latitude.toFixed(5)}, ${metadata.longitude.toFixed(5)}`}
        </p>
      )}
      {message.type === ChatMessageType.QUICK_ACTION && metadata && "actionKey" in metadata && (
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
          {metadata.actionKey}
        </p>
      )}
      {message.attachments.length > 0 && (
        <MessageAttachments
          attachments={message.attachments}
          durationMs={metadata && "durationMs" in metadata ? metadata.durationMs : undefined}
        />
      )}
      {message.content && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>}
    </>
  );
}

function MessageBubbleImpl({
  message,
  mine,
  senderLabel,
  showSender,
  firstInGroup,
  lastInGroup,
  replyTarget,
  replyName,
  pinned,
  delivery,
  highlighted,
  locale,
  caps,
  handlers,
}: MessageBubbleProps) {
  const t = useTranslations("Chat");
  if (message.type === ChatMessageType.SYSTEM_EVENT) return <SystemRow message={message} />;
  const permissions = messagePermissions(message, mine, caps);
  const hasReply = message.replyToMessageId !== null;

  const persisted = message.localState === "sent";
  const anyAction =
    persisted &&
    !message.deletedAt &&
    (permissions.reply ||
      permissions.react ||
      permissions.edit ||
      permissions.delete ||
      permissions.pin ||
      permissions.report ||
      permissions.remove);

  return (
    <div
      id={message.id ? `msg-${message.id}` : undefined}
      className={cn(
        "group flex w-full flex-col px-3 sm:px-4 [content-visibility:auto] [contain-intrinsic-size:auto_64px]",
        mine ? "items-end" : "items-start",
        firstInGroup ? "mt-2" : "mt-0.5",
      )}
    >
      <div className={cn("flex max-w-[85%] items-end gap-1 sm:max-w-[70%]", mine && "flex-row-reverse")}>
        <div
          className={cn(
            "relative min-w-0 rounded-2xl px-3 py-2 text-sm leading-relaxed transition-shadow",
            mine ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground",
            mine && lastInGroup && "rounded-ee-md",
            !mine && lastInGroup && "rounded-es-md",
            highlighted && "ring-2 ring-ring ring-offset-2 ring-offset-surface",
            message.localState === "failed" && "opacity-80",
          )}
        >
          {showSender && <p className="mb-0.5 text-xs font-semibold opacity-80">{senderLabel}</p>}

          {hasReply && (
            <button
              type="button"
              disabled={!replyTarget?.id}
              onClick={() => replyTarget?.id && handlers.onJumpTo(replyTarget.id)}
              className={cn(
                "mb-1 block w-full rounded-lg border-s-2 px-2 py-1 text-start text-xs",
                mine ? "border-primary-foreground/60 bg-primary-foreground/10" : "border-primary bg-surface/60",
              )}
            >
              {replyTarget ? (
                <>
                  <span className="block font-semibold">{replyName}</span>
                  <span className="line-clamp-2 opacity-80">
                    {replyTarget.deletedAt ? t("deletedMessage") : replyTarget.content}
                  </span>
                </>
              ) : (
                <span className="italic opacity-80">{t("originalUnavailable")}</span>
              )}
            </button>
          )}

          <MessageBody message={message} />

          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1.5 text-[11px]",
              mine ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {pinned && (
              <span title={t("pinned")} className="inline-flex">
                <Pin className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">{t("pinned")}</span>
              </span>
            )}
            {message.editedAt && !message.deletedAt && <span>{t("edited")}</span>}
            <time dateTime={message.createdAt}>{formatClock(message.createdAt, locale)}</time>
            {mine && delivery && <DeliveryStatus status={delivery} />}
          </div>
        </div>

        {anyAction && (
          <MessageActionsMenu
            message={message}
            mine={mine}
            pinned={pinned}
            permissions={permissions}
            handlers={handlers}
          />
        )}
      </div>

      {message.localState === "failed" && (
        <div className="mt-1 flex items-center gap-2 text-xs text-danger" role="alert">
          <span>{message.error ? t(`errors.${message.error}`) : t("errors.generic")}</span>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handlers.onRetry(message)}>
            <RotateCcw className="me-1 h-3.5 w-3.5" aria-hidden="true" />
            {t("retrySend")}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handlers.onDiscard(message)}>
            {t("discard")}
          </Button>
        </div>
      )}

      {!message.deletedAt && message.reactions.length > 0 && (
        <ReactionRow
          message={message}
          canReact={permissions.react}
          mine={mine}
          onToggle={handlers.onToggleReaction}
        />
      )}
    </div>
  );
}

/** Memoized: unchanged messages keep their Redux reference and skip re-render. */
export const MessageBubble = memo(MessageBubbleImpl);
