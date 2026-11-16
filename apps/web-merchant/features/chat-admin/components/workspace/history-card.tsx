"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  ChatMessageType,
  type ChatMessageItem,
  type ChatParticipantItem,
  type ChatStaffProfile,
} from "@dhruto/contracts";
import { Button } from "@dhruto/ui";
import { ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { chatErrorKey } from "@/features/chat/lib/errors";
import { systemEventText } from "@/features/chat/lib/system-events";
import { useGetAdminMessagesQuery, useModerateMessageMutation } from "../../api/chat-admin.api";
import { ChatPermission, can, formatDateTime } from "../../lib/admin";
import { ReasonDialog } from "../reason-dialog";

/**
 * Read-only, audited staff view of the history (`/chat/admin/.../messages`,
 * every page carries the case reason). Participant messaging — including
 * participant-visible staff messages — stays in the existing messenger after
 * a visible intervention; this view never posts. Attachment content is not
 * loaded here: see the attachments section (scan state + grant-gated access).
 */
export function HistoryCard({
  conversationId,
  reason,
  participants,
  profile,
}: {
  conversationId: string;
  reason: string;
  participants: readonly ChatParticipantItem[];
  profile: ChatStaffProfile;
}) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const locale = useLocale();
  const [before, setBefore] = useState<string | undefined>(undefined);
  const [older, setOlder] = useState<ChatMessageItem[]>([]);
  const { data, isLoading, isError, refetch, isFetching } = useGetAdminMessagesQuery({
    id: conversationId,
    reason,
    beforeSequence: before,
  });
  const [moderate] = useModerateMessageMutation();
  const [removing, setRemoving] = useState<ChatMessageItem | null>(null);
  const names = new Map(participants.map((p) => [p.userId, p]));
  const canModerate = can(profile, ChatPermission.MESSAGE_MODERATE);

  if (isLoading) return <LoadingState title={t("loading")} />;
  if (isError || !data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
      />
    );
  }
  // Pages arrive newest-first; render oldest-first.
  const byId = new Map([...older, ...data.items].map((m) => [m.id, m]));
  const messages = [...byId.values()].sort((a, b) =>
    BigInt(a.sequence) < BigInt(b.sequence) ? -1 : 1,
  );
  const oldest = messages[0];

  return (
    <section aria-labelledby="ws-history" className="space-y-3 rounded-xl bg-card p-4">
      <h2 id="ws-history" className="text-sm font-semibold">
        {t("workspace.history")}
      </h2>
      {data.hasMore && oldest && (
        <Button
          size="sm"
          variant="outline"
          disabled={isFetching}
          onClick={() => {
            setOlder(messages);
            setBefore(oldest.sequence);
          }}
        >
          {t("workspace.loadOlder")}
        </Button>
      )}
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("workspace.noMessages")}</p>
      ) : (
        <ol className="space-y-2" aria-label={t("workspace.history")}>
          {messages.map((m) => {
            const sender = m.senderId ? names.get(m.senderId) : null;
            const system = m.type === ChatMessageType.SYSTEM_EVENT;
            return (
              <li
                key={m.id}
                className={
                  system
                    ? "text-center text-xs text-muted-foreground"
                    : "rounded-lg bg-surface-muted p-3 text-sm"
                }
              >
                {system ? (
                  systemEventText(m.metadata, tc)
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {sender
                          ? `${sender.displayName} · ${tc(`platformRoles.${sender.platformRole}`)}`
                          : t("workspace.formerParticipant")}
                      </span>
                      <time dateTime={m.createdAt}>{formatDateTime(m.createdAt, locale)}</time>
                    </div>
                    {m.deletedAt ? (
                      <p className="italic text-muted-foreground">{tc("deletedMessage")}</p>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                    {m.attachments.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="h-3 w-3" aria-hidden="true" />
                        {m.attachments
                          .map((a) => `${a.originalFilename} (${t(`scanStatus.${a.scanStatus}`)})`)
                          .join(", ")}
                      </p>
                    )}
                    {canModerate && !m.deletedAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-7 px-2 text-xs"
                        onClick={() => setRemoving(m)}
                      >
                        {t("workspace.remove")}
                      </Button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <ReasonDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("workspace.removeTitle")}
        description={t("workspace.removeDescription")}
        confirmLabel={t("workspace.remove")}
        onSubmit={async (why) => {
          if (!removing) return false;
          try {
            await moderate({ messageId: removing.id, reason: why }).unwrap();
            setOlder([]);
            setBefore(undefined);
            await refetch();
            toast.success(t("workspace.removed"));
            return true;
          } catch (error) {
            toast.error(tc(`errors.${chatErrorKey(error)}`));
            return false;
          }
        }}
      />
    </section>
  );
}
