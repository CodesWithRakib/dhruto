"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CHAT_ESCALATION_TRANSITIONS,
  ChatEscalationStatus,
  escalationNoteRequired,
  type ChatStaffProfile,
} from "@dhruto/contracts";
import { Button } from "@dhruto/ui";
import { ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { ToneBadge } from "@/components/data-display/tone-badge";
import { chatErrorKey } from "@/features/chat/lib/errors";
import { useGetEscalationQuery, useUpdateEscalationMutation } from "../../api/chat-admin.api";
import { ChatPermission, ESCALATION_TONE, can, formatDateTime } from "../../lib/admin";
import { ReasonDialog } from "../reason-dialog";

/**
 * Escalation state, allowed next steps (shared transition table) and history.
 * Escalation never changes the conversation's lifecycle or any parcel.
 */
export function EscalationCard({
  conversationId,
  profile,
}: {
  conversationId: string;
  profile: ChatStaffProfile;
}) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useGetEscalationQuery(conversationId);
  const [update] = useUpdateEscalationMutation();
  const [target, setTarget] = useState<ChatEscalationStatus | null>(null);
  const manage = can(profile, ChatPermission.ESCALATION_MANAGE);

  const submit = async (status: ChatEscalationStatus, note: string, assignToMe = false) => {
    try {
      await update({
        id: conversationId,
        body: {
          status,
          ...(note ? { note } : {}),
          ...(assignToMe ? { assigneeUserId: profile.userId } : {}),
        },
      }).unwrap();
      toast.success(t("escalation.updated"));
      return true;
    } catch (error) {
      toast.error(tc(`errors.${chatErrorKey(error)}`));
      return false;
    }
  };

  if (isLoading) return <LoadingState title={t("loading")} />;
  if (isError || !data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
      />
    );
  }
  const current = data.current;
  const next = CHAT_ESCALATION_TRANSITIONS[current.status ?? "NONE"];

  return (
    <section aria-labelledby="ws-escalation" className="space-y-3 rounded-xl bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="ws-escalation" className="text-sm font-semibold">
          {t("escalation.title")}
        </h2>
        {current.status ? (
          <ToneBadge tone={ESCALATION_TONE[current.status]}>
            {t(`escalationStatus.${current.status}`)}
          </ToneBadge>
        ) : (
          <ToneBadge tone="neutral">{t("escalation.none")}</ToneBadge>
        )}
      </div>
      {current.note ? <p className="text-sm">{current.note}</p> : null}
      {current.assigneeName ? (
        <p className="text-xs text-muted-foreground">
          {t("escalation.assignee", { name: current.assigneeName })}
        </p>
      ) : null}
      {manage && (
        <div className="flex flex-wrap gap-2">
          {next.map((status) =>
            status === ChatEscalationStatus.IN_REVIEW ? (
              <Button
                key={status}
                size="sm"
                variant="secondary"
                onClick={() => void submit(status, "", true)}
              >
                {t("escalation.takeReview")}
              </Button>
            ) : (
              <Button
                key={status}
                size="sm"
                variant={status === ChatEscalationStatus.ESCALATED ? "destructive" : "outline"}
                onClick={() => setTarget(status)}
              >
                {t(`escalation.to.${status}`)}
              </Button>
            ),
          )}
        </div>
      )}
      {data.history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            {t("escalation.history", { count: data.history.length })}
          </summary>
          <ol className="mt-2 space-y-2">
            {data.history.map((h) => (
              <li key={h.id} className="text-xs">
                <span className="font-medium">
                  {h.from ? t(`escalationStatus.${h.from}`) : t("escalation.none")} →{" "}
                  {h.to ? t(`escalationStatus.${h.to}`) : "—"}
                </span>{" "}
                <span className="text-muted-foreground">
                  {h.actorName ?? t("audit.system")} · {formatDateTime(h.createdAt, locale)}
                </span>
                {h.note ? <p className="text-muted-foreground">{h.note}</p> : null}
              </li>
            ))}
          </ol>
        </details>
      )}
      <ReasonDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target ? t(`escalation.to.${target}`) : ""}
        description={t("escalation.noteDescription")}
        confirmLabel={t("escalation.confirm")}
        optional={target !== null && !escalationNoteRequired(target)}
        maxLength={1000}
        onSubmit={(note) => (target ? submit(target, note) : Promise.resolve(false))}
      />
    </section>
  );
}
