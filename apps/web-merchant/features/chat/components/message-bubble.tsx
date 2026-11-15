"use client";

import React, { memo } from "react";
import { useTranslations } from "next-intl";
import {
  Flag,
  MapPin,
  MoreVertical,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Reply,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@dhruto/ui";
import { ChatMessageDeliveryStatus, ChatMessageType } from "@dhruto/contracts";
import { formatClock } from "../lib/display";
import { type TimelineMessage } from "../lib/timeline";
import { messagePermissions, type ConversationCaps, type MessagePermissions } from "../lib/permissions";
import { DeliveryStatus } from "./chat-primitives";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export interface MessageBubbleHandlers {
  onReply: (message: TimelineMessage) => void;
  onEdit: (message: TimelineMessage) => void;
  onDelete: (message: TimelineMessage) => void;
  onRemove: (message: TimelineMessage) => void;
  onReport: (message: TimelineMessage) => void;
  onTogglePin: (message: TimelineMessage, pinned: boolean) => void;
  onToggleReaction: (message: TimelineMessage, reaction: string) => void;
  onRetry: (message: TimelineMessage) => void;
  onDiscard: (message: TimelineMessage) => void;
  onJumpTo: (messageId: string) => void;
}

export interface MessageBubbleProps {
  message: TimelineMessage;
  mine: boolean;
  senderLabel: string;
  showSender: boolean;
  firstInGroup: boolean;
  lastInGroup: boolean;
  /** Reply target as stored (stable reference); null when not loaded. */
  replyTarget?: TimelineMessage | null;
  replyName?: string;
  pinned: boolean;
  delivery: ChatMessageDeliveryStatus | null;
  highlighted: boolean;
  locale: string;
  /** Stable, memoized per conversation (keeps React.memo effective). */
  caps: ConversationCaps;
  handlers: MessageBubbleHandlers;
}

function SystemRow({ message }: { message: TimelineMessage }) {
  const t = useTranslations("Chat");
  const key =
    message.metadata && "eventKey" in message.metadata ? message.metadata.eventKey : null;
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        {key === "chat.staff_joined" ? t("systemStaffJoined") : t("systemEvent")}
      </span>
    </div>
  );
}

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
        <ul className="mb-1 space-y-1">
          {message.attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-1.5 text-sm">
              <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{attachment.originalFilename}</span>
            </li>
          ))}
        </ul>
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
    (permissions.reply || permissions.react || permissions.edit || permissions.delete || permissions.pin || permissions.report || permissions.remove);

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
            mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
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

          <div className={cn("mt-1 flex items-center justify-end gap-1.5 text-[11px]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}>
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
        <ReactionRow message={message} canReact={permissions.react} mine={mine} onToggle={handlers.onToggleReaction} />
      )}
    </div>
  );
}

function ReactionRow({
  message,
  canReact,
  mine,
  onToggle,
}: {
  message: TimelineMessage;
  canReact: boolean;
  mine: boolean;
  onToggle: (message: TimelineMessage, reaction: string) => void;
}) {
  const t = useTranslations("Chat");
  return (
    <ul className={cn("mt-1 flex max-w-[85%] flex-wrap gap-1 sm:max-w-[70%]", mine && "justify-end")}>
      {message.reactions.map((reaction) => (
        <li key={reaction.reaction}>
          <button
            type="button"
            disabled={!canReact}
            aria-pressed={reaction.reactedByMe}
            aria-label={t("reactionLabel", { reaction: reaction.reaction, count: reaction.count })}
            onClick={() => onToggle(message, reaction.reaction)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
              reaction.reactedByMe ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-surface text-foreground",
              canReact && "hover:bg-surface-muted",
            )}
          >
            <span aria-hidden="true">{reaction.reaction}</span>
            <span>{reaction.count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MessageActionsMenu({
  message,
  mine,
  pinned,
  permissions,
  handlers,
}: {
  message: TimelineMessage;
  mine: boolean;
  pinned: boolean;
  permissions: MessagePermissions;
  handlers: MessageBubbleHandlers;
}) {
  const t = useTranslations("Chat.actions");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("menu")}
          className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mine ? "end" : "start"} className="w-52">
        {permissions.react && (
          <div className="flex justify-between px-1 py-1" role="group" aria-label={t("react")}>
            {QUICK_REACTIONS.map((reaction) => (
              <DropdownMenuItem
                key={reaction}
                className="h-8 w-8 justify-center p-0 text-base"
                onSelect={() => handlers.onToggleReaction(message, reaction)}
              >
                <span aria-hidden="true">{reaction}</span>
                <span className="sr-only">{reaction}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        {permissions.react && <DropdownMenuSeparator />}
        {permissions.reply && (
          <DropdownMenuItem onSelect={() => handlers.onReply(message)}>
            <Reply className="me-2 h-4 w-4" aria-hidden="true" />
            {t("reply")}
          </DropdownMenuItem>
        )}
        {permissions.edit && (
          <DropdownMenuItem onSelect={() => handlers.onEdit(message)}>
            <Pencil className="me-2 h-4 w-4" aria-hidden="true" />
            {t("edit")}
          </DropdownMenuItem>
        )}
        {permissions.pin && (
          <DropdownMenuItem onSelect={() => handlers.onTogglePin(message, pinned)}>
            {pinned ? <PinOff className="me-2 h-4 w-4" aria-hidden="true" /> : <Pin className="me-2 h-4 w-4" aria-hidden="true" />}
            {pinned ? t("unpin") : t("pin")}
          </DropdownMenuItem>
        )}
        {permissions.report && (
          <DropdownMenuItem onSelect={() => handlers.onReport(message)}>
            <Flag className="me-2 h-4 w-4" aria-hidden="true" />
            {t("report")}
          </DropdownMenuItem>
        )}
        {(permissions.delete || permissions.remove) && <DropdownMenuSeparator />}
        {permissions.delete && (
          <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => handlers.onDelete(message)}>
            <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
            {t("delete")}
          </DropdownMenuItem>
        )}
        {permissions.remove && (
          <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => handlers.onRemove(message)}>
            <ShieldAlert className="me-2 h-4 w-4" aria-hidden="true" />
            {t("remove")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Memoized: unchanged messages keep their Redux reference and skip re-render. */
export const MessageBubble = memo(MessageBubbleImpl);
