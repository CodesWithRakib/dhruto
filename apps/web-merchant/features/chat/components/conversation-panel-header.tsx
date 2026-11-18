"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { type MessengerRoutes } from "../lib/routes";
import { ChatAvatar } from "./chat-primitives";

export function PresenceSubtitle({
  typeLabel,
  participantCount,
  otherUserId,
}: {
  typeLabel: string;
  participantCount: number;
  otherUserId: string | null;
}) {
  const t = useTranslations("Chat");
  const presence = useAppSelector((state) =>
    otherUserId ? state.chatEphemeral.presence[otherUserId] : undefined,
  );
  if (presence) {
    return (
      <p className="truncate text-xs text-muted-foreground">
        {presence.status === "online" ? t("online") : t("offline")}
      </p>
    );
  }
  return (
    <p className="truncate text-xs text-muted-foreground">
      {typeLabel}
      {participantCount > 0 ? ` · ${t("participants")}: ${participantCount}` : ""}
    </p>
  );
}

export function ConversationPanelHeader({
  routes,
  title,
  typeLabel,
  participantCount,
  otherUserId,
  hasDetail,
  infoOpen,
  onInfoOpenChange,
}: {
  routes: MessengerRoutes;
  title: string;
  typeLabel: string;
  participantCount: number;
  otherUserId: string | null;
  hasDetail: boolean;
  infoOpen: boolean;
  onInfoOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Chat");

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-surface/50 backdrop-blur px-2 sm:px-4">
      <Button asChild variant="ghost" size="icon-sm" className="md:hidden">
        <Link href={routes.list} aria-label={t("backToList")}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </Button>
      {hasDetail && <ChatAvatar name={title} size="sm" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <PresenceSubtitle
          typeLabel={typeLabel}
          participantCount={participantCount}
          otherUserId={otherUserId}
        />
      </div>
      {hasDetail && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("info")}
          aria-expanded={infoOpen}
          onClick={() => onInfoOpenChange(!infoOpen)}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </header>
  );
}
