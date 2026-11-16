"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import {
  ChatReportStatus,
  type ChatReportItem,
  type ChatStaffProfile,
  type ReviewChatReportRequest,
} from "@dhruto/contracts";
import { Button, Label } from "@dhruto/ui";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { ToneBadge } from "@/components/data-display/tone-badge";
import { ADMIN_ROUTES } from "@/config/routes";
import { Link } from "@/lib/navigation";
import { chatErrorKey } from "@/features/chat/lib/errors";
import { useGetReportsInfiniteQuery, useReviewReportMutation } from "../api/chat-admin.api";
import { formatDateTime } from "../lib/admin";
import { ReasonDialog } from "./reason-dialog";

const STATUS_TONE = {
  [ChatReportStatus.OPEN]: "warning",
  [ChatReportStatus.UNDER_REVIEW]: "info",
  [ChatReportStatus.RESOLVED]: "success",
  [ChatReportStatus.DISMISSED]: "neutral",
} as const;

type Decision = {
  report: ChatReportItem;
  status: ChatReportStatus.RESOLVED | ChatReportStatus.DISMISSED;
};

/**
 * Report queue. Content is never shown here: reviewing the reported message
 * happens in the conversation workspace (reason-gated, audited). Resolving
 * or dismissing requires a note (backend-enforced too).
 */
export function ReportsPanel({
  conversationId,
}: {
  profile?: ChatStaffProfile;
  conversationId?: string;
}) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const locale = useLocale();
  const [status, setStatus] = useState<ChatReportStatus | undefined>(
    conversationId ? undefined : ChatReportStatus.OPEN,
  );
  const query = useGetReportsInfiniteQuery({ status, conversationId });
  const [review, { isLoading: reviewing }] = useReviewReportMutation();
  const [decision, setDecision] = useState<Decision | null>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  const submit = async (
    report: ChatReportItem,
    next: ReviewChatReportRequest["status"],
    note?: string,
  ) => {
    try {
      await review({
        id: report.id,
        body: { status: next, ...(note ? { resolutionNote: note } : {}) },
      }).unwrap();
      toast.success(t("reports.updated"));
      return true;
    } catch (error) {
      toast.error(tc(`errors.${chatErrorKey(error)}`));
      return false;
    }
  };

  return (
    <div className="space-y-4">
      {!conversationId && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor="reports-status">{t("reports.status")}</Label>
            <select
              id="reports-status"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status ?? ""}
              onChange={(event) =>
                setStatus((event.target.value || undefined) as ChatReportStatus | undefined)
              }
            >
              <option value="">{t("inbox.any")}</option>
              {Object.values(ChatReportStatus).map((s) => (
                <option key={s} value={s}>
                  {t(`reportStatus.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {query.isLoading ? (
        <LoadingState title={t("loading")} />
      ) : query.isError ? (
        <ErrorState
          title={t("errors.loadFailed")}
          action={<RetryButton label={t("retry")} onRetry={() => void query.refetch()} />}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={Flag} title={t("reports.empty")} />
      ) : (
        <ul
          className="divide-y divide-border/60 overflow-hidden rounded-xl bg-card"
          aria-label={t("reports.results")}
        >
          {items.map((report) => {
            const open =
              report.status === ChatReportStatus.OPEN ||
              report.status === ChatReportStatus.UNDER_REVIEW;
            return (
              <li
                key={report.id}
                className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t(`reportReason.${report.reason}`)}</span>
                    <ToneBadge tone={STATUS_TONE[report.status]}>
                      {t(`reportStatus.${report.status}`)}
                    </ToneBadge>
                  </div>
                  {report.details ? (
                    <p className="text-sm text-muted-foreground">{report.details}</p>
                  ) : null}
                  {report.resolutionNote ? (
                    <p className="text-xs text-muted-foreground">
                      {t("reports.resolution", { note: report.resolutionNote })}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={report.createdAt}>
                      {formatDateTime(report.createdAt, locale)}
                    </time>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!conversationId && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={ADMIN_ROUTES.communicationThread(report.conversationId)}>
                        {t("reports.open")}
                      </Link>
                    </Button>
                  )}
                  {report.status === ChatReportStatus.OPEN && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={reviewing}
                      onClick={() => void submit(report, ChatReportStatus.UNDER_REVIEW)}
                    >
                      {t("reports.startReview")}
                    </Button>
                  )}
                  {open && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setDecision({ report, status: ChatReportStatus.RESOLVED })}
                      >
                        {t("reports.resolve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDecision({ report, status: ChatReportStatus.DISMISSED })}
                      >
                        {t("reports.dismiss")}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {t("loadMore")}
          </Button>
        </div>
      )}
      <ReasonDialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={
          decision?.status === ChatReportStatus.DISMISSED
            ? t("reports.dismissTitle")
            : t("reports.resolveTitle")
        }
        description={t("reports.noteDescription")}
        confirmLabel={
          decision?.status === ChatReportStatus.DISMISSED
            ? t("reports.dismiss")
            : t("reports.resolve")
        }
        minLength={1}
        maxLength={1000}
        onSubmit={(note) =>
          decision ? submit(decision.report, decision.status, note) : Promise.resolve(false)
        }
      />
    </div>
  );
}
