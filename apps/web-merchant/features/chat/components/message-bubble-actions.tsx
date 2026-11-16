"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Flag,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Reply,
  ShieldAlert,
  Trash2,
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
import { systemEventText } from "../lib/system-events";
import { type TimelineMessage } from "../lib/timeline";
import { type MessagePermissions } from "../lib/permissions";
import { type MessageBubbleHandlers } from "./message-bubble-types";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export function SystemRow({ message }: { message: TimelineMessage }) {
  const t = useTranslations("Chat");
  return (
    <div className="flex justify-center py-1">
      <span className="max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
        {systemEventText(message.metadata, t)}
      </span>
    </div>
  );
}

export function ReactionRow({
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
              reaction.reactedByMe
                ? "border-primary bg-primary-soft text-primary-soft-foreground"
                : "border-border bg-surface text-foreground",
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

export function MessageActionsMenu({
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
