"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, ShieldCheck } from "lucide-react";
import { ChatAttachmentScanStatus, type ChatStaffProfile } from "@dhruto/contracts";
import { Button, Label } from "@dhruto/ui";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { useGetAttachmentQueueInfiniteQuery, useGetRetentionQuery } from "../api/chat-admin.api";
import { ChatPermission, can } from "../lib/admin";
import { AttachmentReviewList } from "./attachment-review-list";

/**
 * Attachment security: the quarantine/scan queue and the retention policy.
 * Both require explicit per-user grants; without them an explanatory
 * "restricted" state is shown and no request is made.
 */
export function AttachmentsPanel({ profile }: { profile: ChatStaffProfile }) {
  const t = useTranslations("ChatAdmin");
  const canQueue = can(profile, ChatPermission.ATTACHMENT_RESTRICTED_ACCESS);
  const canRetention = can(profile, ChatPermission.RETENTION_MANAGE);
  return (
    <div className="space-y-6">
      {canQueue ? (
        <QuarantineQueue profile={profile} />
      ) : (
        <EmptyState
          icon={Lock}
          title={t("attachments.restrictedTitle")}
          description={t("attachments.restrictedDescription")}
        />
      )}
      {canRetention ? <RetentionStatus /> : null}
    </div>
  );
}

function QuarantineQueue({ profile }: { profile: ChatStaffProfile }) {
  const t = useTranslations("ChatAdmin");
  const [scanStatus, setScanStatus] = useState<ChatAttachmentScanStatus | undefined>(undefined);
  const query = useGetAttachmentQueueInfiniteQuery({ scanStatus });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section aria-labelledby="ca-queue" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="ca-queue" className="text-lg font-semibold">
          {t("attachments.queueTitle")}
        </h2>
        <div className="space-y-1">
          <Label htmlFor="ca-scan">{t("attachments.scanFilter")}</Label>
          <select
            id="ca-scan"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={scanStatus ?? ""}
            onChange={(event) =>
              setScanStatus(
                (event.target.value || undefined) as ChatAttachmentScanStatus | undefined,
              )
            }
          >
            <option value="">{t("attachments.blockedOnly")}</option>
            {Object.values(ChatAttachmentScanStatus).map((s) => (
              <option key={s} value={s}>
                {t(`scanStatus.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {query.isLoading ? (
        <LoadingState title={t("loading")} />
      ) : query.isError ? (
        <ErrorState
          title={t("errors.loadFailed")}
          action={<RetryButton label={t("retry")} onRetry={() => void query.refetch()} />}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("attachments.queueEmpty")} />
      ) : (
        <AttachmentReviewList items={items} profile={profile} showConversationLink />
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
    </section>
  );
}

function formatSeconds(seconds: number | null, t: ReturnType<typeof useTranslations>): string {
  if (seconds === null) return t("retention.indefinite");
  if (seconds % 86_400 === 0) return t("retention.days", { count: seconds / 86_400 });
  if (seconds % 3600 === 0) return t("retention.hours", { count: seconds / 3600 });
  return t("retention.seconds", { count: seconds });
}

function RetentionStatus() {
  const t = useTranslations("ChatAdmin");
  const { data, isLoading, isError, refetch } = useGetRetentionQuery();
  return (
    <section aria-labelledby="ca-retention" className="space-y-3">
      <h2 id="ca-retention" className="text-lg font-semibold">
        {t("retention.title")}
      </h2>
      {isLoading ? (
        <LoadingState title={t("loading")} />
      ) : isError || !data ? (
        <ErrorState
          title={t("errors.loadFailed")}
          action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
        />
      ) : (
        <div className="space-y-3 rounded-xl bg-card p-4">
          <p className="text-sm">
            {data.scannerConfigured
              ? t("retention.scannerOn", { engine: data.scannerEngine ?? "" })
              : t("retention.scannerOff")}
          </p>
          <table className="w-full text-sm">
            <caption className="sr-only">{t("retention.title")}</caption>
            <thead className="text-start text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 text-start font-medium">
                  {t("retention.category")}
                </th>
                <th scope="col" className="py-1 text-start font-medium">
                  {t("retention.period")}
                </th>
                <th scope="col" className="py-1 text-start font-medium">
                  {t("retention.eligible")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.policies.map((policy) => (
                <tr key={policy.category}>
                  <td className="py-2">{t(`retention.categories.${policy.category}`)}</td>
                  <td className="py-2">{formatSeconds(policy.retentionSeconds, t)}</td>
                  <td className="py-2 tabular-nums">{policy.eligibleCount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">{t("retention.evidenceHold")}</p>
        </div>
      )}
    </section>
  );
}
