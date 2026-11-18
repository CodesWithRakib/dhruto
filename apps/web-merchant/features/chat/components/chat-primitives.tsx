"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, CheckCheck, Clock, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback, cn } from "@dhruto/ui";
import { ChatMessageDeliveryStatus } from "@dhruto/contracts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { typingPruned } from "../state/chat-ephemeral.slice";
import { initials } from "../lib/display";

export function ChatAvatar({
  name,
  online,
  size = "md",
  className,
}: {
  name: string;
  online?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useTranslations("Chat");
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={size === "sm" ? "h-8 w-8" : "h-10 w-10"}>
        <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {online !== undefined && <PresenceDot online={online} label={online ? t("online") : t("offline")} />}
    </span>
  );
}

export function PresenceDot({ online, label }: { online: boolean; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "absolute bottom-0 end-0 h-3 w-3 rounded-full",
        online ? "bg-success" : "bg-muted-foreground/50",
      )}
    />
  );
}

/** Sent / delivered / read / pending / failed indicator for my own messages. */
export function DeliveryStatus({ status }: { status: ChatMessageDeliveryStatus }) {
  const t = useTranslations("Chat.delivery");
  const label = t(status);
  const icon =
    status === ChatMessageDeliveryStatus.PENDING ? (
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
    ) : status === ChatMessageDeliveryStatus.FAILED ? (
      <AlertCircle className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
    ) : status === ChatMessageDeliveryStatus.SENT ? (
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <CheckCheck
        className={cn("h-3.5 w-3.5", status === ChatMessageDeliveryStatus.READ && "text-info")}
        aria-hidden="true"
      />
    );
  return (
    <span className="inline-flex items-center" title={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * "X is typing…" for one conversation. Selects only that conversation's
 * typing map, so typing churn never re-renders the timeline. Prunes expired
 * indicators locally (the server also sends an explicit stop).
 */
export function TypingIndicator({
  conversationId,
  nameOf,
}: {
  conversationId: string;
  nameOf: (userId: string) => string;
}) {
  const t = useTranslations("Chat");
  const dispatch = useAppDispatch();
  const typing = useAppSelector((state) => state.chatEphemeral.typing[conversationId]);
  const userIds = typing ? Object.keys(typing) : [];
  const hasTypers = userIds.length > 0;

  useEffect(() => {
    if (!hasTypers) return;
    const timer = setInterval(() => dispatch(typingPruned(Date.now())), 1000);
    return () => clearInterval(timer);
  }, [hasTypers, dispatch]);

  return (
    <div aria-live="polite" className="h-5 px-4 text-xs text-muted-foreground">
      {hasTypers &&
        (userIds.length === 1
          ? t("typingOne", { name: nameOf(userIds[0] ?? "") })
          : t("typingMany", { count: userIds.length }))}
    </div>
  );
}

/** Non-blocking realtime status: messaging keeps working over REST meanwhile. */
export function ConnectionBanner() {
  const t = useTranslations("Chat.connection");
  const connection = useAppSelector((state) => state.chatEphemeral.connection);
  if (connection === "connected" || connection === "idle") return null;
  const tone = connection === "unauthorized" ? "bg-danger-soft text-danger-soft-foreground" : "bg-warning-soft text-warning-soft-foreground";
  return (
    <div role="status" className={cn("flex items-center gap-2 px-4 py-1.5 text-xs font-medium", tone)}>
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t(connection)}</span>
    </div>
  );
}
