"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { CHAT_REASON_MIN_LENGTH, type ChatStaffProfile } from "@dhruto/contracts";
import { Button, Label, Textarea } from "@dhruto/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NotFoundState,
  RetryButton,
} from "@/components/feedback/states";
import { ToneBadge } from "@/components/data-display/tone-badge";
import { ADMIN_ROUTES } from "@/config/routes";
import { Link } from "@/lib/navigation";
import { chatErrorKey } from "@/features/chat/lib/errors";
import {
  useGetConversationAttachmentsQuery,
  useGetStaffProfileQuery,
  useInterveneMutation,
  useViewConversationQuery,
} from "../../api/chat-admin.api";
import { ChatPermission, can, formatDateTime } from "../../lib/admin";
import { AuditPanel } from "../audit-panel";
import { AttachmentReviewList } from "../attachment-review-list";
import { ReasonDialog } from "../reason-dialog";
import { ReportsPanel } from "../reports-panel";
import { EscalationCard } from "./escalation-card";
import { HistoryCard } from "./history-card";
import { NotesCard } from "./notes-card";

/**
 * Conversation workspace (Phase 7). Opening a conversation the admin does not
 * participate in requires a case reason first: every content read made from
 * this page carries it and is audited. The reason lives only in component
 * state for this visit.
 */
export function ConversationWorkspace({ conversationId }: { conversationId: string }) {
  const t = useTranslations("ChatAdmin");
  const profile = useGetStaffProfileQuery();
  const [reason, setReason] = useState<string | null>(null);

  if (profile.isLoading) return <LoadingState title={t("loading")} />;
  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        action={<RetryButton label={t("retry")} onRetry={() => void profile.refetch()} />}
      />
    );
  }
  if (!can(profile.data, ChatPermission.CONVERSATION_VIEW_ANY)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("unauthorized.title")}
        description={t("unauthorized.description")}
      />
    );
  }
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-24 pt-4 sm:px-6 sm:pb-8">
      <Button asChild variant="ghost" size="sm">
        <Link href={`${ADMIN_ROUTES.communications}?tab=inbox`}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t("workspace.back")}
        </Link>
      </Button>
      {reason === null ? (
        <ReasonGate onSubmit={setReason} />
      ) : (
        <CaseView conversationId={conversationId} reason={reason} profile={profile.data} />
      )}
    </div>
  );
}

function ReasonGate({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const t = useTranslations("ChatAdmin");
  const id = useId();
  const [value, setValue] = useState("");
  const valid = value.trim().length >= CHAT_REASON_MIN_LENGTH;
  return (
    <form
      className="mx-auto max-w-xl space-y-4 rounded-xl bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit(value.trim());
      }}
    >
      <h1 className="text-xl font-semibold">{t("workspace.gateTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("workspace.gateDescription")}</p>
      <div className="space-y-1.5">
        <Label htmlFor={id}>{t("reason.label")}</Label>
        <Textarea
          id={id}
          rows={3}
          maxLength={500}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {t("reason.hint", { min: CHAT_REASON_MIN_LENGTH })}
        </p>
      </div>
      <Button type="submit" disabled={!valid}>
        {t("workspace.gateConfirm")}
      </Button>
    </form>
  );
}

function CaseView({
  conversationId,
  reason,
  profile,
}: {
  conversationId: string;
  reason: string;
  profile: ChatStaffProfile;
}) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const locale = useLocale();
  const detail = useViewConversationQuery({ id: conversationId, reason });
  const attachments = useGetConversationAttachmentsQuery({ id: conversationId, reason });
  const [intervene, { isLoading: joining }] = useInterveneMutation();
  const [joinOpen, setJoinOpen] = useState(false);
  const [joined, setJoined] = useState(false);

  if (detail.isLoading) return <LoadingState title={t("loading")} />;
  if (detail.isError || !detail.data) {
    const status = detail.error && "status" in detail.error ? detail.error.status : null;
    return status === 404 ? (
      <NotFoundState title={t("workspace.notFound")} />
    ) : (
      <ErrorState
        title={t("errors.loadFailed")}
        action={<RetryButton label={t("retry")} onRetry={() => void detail.refetch()} />}
      />
    );
  }
  const c = detail.data;
  const isMember = joined || c.participants.some((p) => p.userId === profile.userId);
  const title = c.title ?? tc(`types.${c.type}`);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{tc(`types.${c.type}`)}</span>
            <ToneBadge tone={c.status === "ACTIVE" ? "success" : "neutral"}>
              {t(`conversationStatus.${c.status}`)}
            </ToneBadge>
            <span>{t("workspace.created", { time: formatDateTime(c.createdAt, locale) })}</span>
            {c.parcelId ? (
              <Link className="underline" href={ADMIN_ROUTES.parcel(c.parcelId)}>
                {tc("viewParcel")}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isMember ? (
            <Button asChild>
              <Link href={ADMIN_ROUTES.messageThread(c.id)}>{t("workspace.openMessenger")}</Link>
            </Button>
          ) : can(profile, ChatPermission.CONVERSATION_INTERVENE) ? (
            <Button onClick={() => setJoinOpen(true)} disabled={joining}>
              {t("workspace.intervene")}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <HistoryCard
            conversationId={c.id}
            reason={reason}
            participants={c.participants}
            profile={profile}
          />
          <section aria-labelledby="ws-attachments" className="space-y-3">
            <h2 id="ws-attachments" className="text-sm font-semibold">
              {t("workspace.attachments")}
            </h2>
            {attachments.isLoading ? (
              <LoadingState title={t("loading")} />
            ) : attachments.isError || !attachments.data ? (
              <ErrorState title={t("errors.loadFailed")} />
            ) : attachments.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("workspace.noAttachments")}</p>
            ) : (
              <AttachmentReviewList items={attachments.data} profile={profile} />
            )}
          </section>
          {can(profile, ChatPermission.REPORT_REVIEW) && (
            <section aria-labelledby="ws-reports" className="space-y-3">
              <h2 id="ws-reports" className="text-sm font-semibold">
                {t("workspace.reports")}
              </h2>
              <ReportsPanel conversationId={c.id} />
            </section>
          )}
        </div>
        <aside className="space-y-4">
          <section aria-labelledby="ws-participants" className="space-y-2 rounded-xl bg-card p-4">
            <h2 id="ws-participants" className="text-sm font-semibold">
              {t("workspace.participants", { count: c.participants.length })}
            </h2>
            <ul className="space-y-1.5 text-sm">
              {c.participants.map((p) => (
                <li key={p.userId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.displayName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {tc(`platformRoles.${p.platformRole}`)} · {tc(`participantRoles.${p.role}`)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <EscalationCard conversationId={c.id} profile={profile} />
          {can(profile, ChatPermission.INTERNAL_NOTE_MANAGE) && <NotesCard conversationId={c.id} />}
          {can(profile, ChatPermission.AUDIT_VIEW) && (
            <section aria-labelledby="ws-audit" className="space-y-2 rounded-xl bg-card p-4">
              <h2 id="ws-audit" className="text-sm font-semibold">
                {t("workspace.audit")}
              </h2>
              <AuditPanel conversationId={c.id} />
            </section>
          )}
        </aside>
      </div>

      <ReasonDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        title={tc("staffJoinTitle")}
        description={tc("staffJoinDescription")}
        confirmLabel={tc("staffJoinConfirm")}
        onSubmit={async (why) => {
          try {
            await intervene({ id: c.id, reason: why }).unwrap();
            setJoined(true);
            toast.success(t("workspace.joined"));
            return true;
          } catch (error) {
            toast.error(tc(`errors.${chatErrorKey(error)}`));
            return false;
          }
        }}
      />
    </div>
  );
}
