"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  ChatAttachmentScanStatus,
  type ChatAdminAttachmentItem,
  type ChatStaffProfile,
} from "@dhruto/contracts";
import { Button } from "@dhruto/ui";
import { ToneBadge } from "@/components/data-display/tone-badge";
import { ADMIN_ROUTES } from "@/config/routes";
import { Link } from "@/lib/navigation";
import { chatErrorKey } from "@/features/chat/lib/errors";
import { formatBytes } from "@/features/chat/lib/upload";
import { useDecideAttachmentMutation, useLazyRestrictedDownloadQuery } from "../api/chat-admin.api";
import { ChatPermission, SCAN_TONE, can, formatDateTime, triggerDownload } from "../lib/admin";
import { ReasonDialog } from "./reason-dialog";

type Pending =
  | { kind: "download"; item: ChatAdminAttachmentItem }
  | { kind: "RELEASE" | "RESCAN"; item: ChatAdminAttachmentItem };

const INTEGRITY_ERRORS = new Set(["checksum_mismatch", "object_missing"]);

/**
 * Attachment metadata with scan state, plus grant-gated staff actions
 * (restricted download, release, rescan). Each action asks for a reason; the
 * backend checks the explicit grant and audits. Download URLs are used once
 * and never stored.
 */
export function AttachmentReviewList({
  items,
  profile,
  showConversationLink = false,
}: {
  items: readonly ChatAdminAttachmentItem[];
  profile: ChatStaffProfile;
  showConversationLink?: boolean;
}) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const locale = useLocale();
  const [pending, setPending] = useState<Pending | null>(null);
  const [fetchDownload] = useLazyRestrictedDownloadQuery();
  const [decide] = useDecideAttachmentMutation();
  const canAccess = can(profile, ChatPermission.ATTACHMENT_RESTRICTED_ACCESS);
  const canManage = can(profile, ChatPermission.ATTACHMENT_QUARANTINE_MANAGE);

  const submit = async (reason: string): Promise<boolean> => {
    if (!pending) return false;
    try {
      if (pending.kind === "download") {
        const { url } = await fetchDownload({ id: pending.item.id, reason }, false).unwrap();
        triggerDownload(url);
      } else {
        await decide({ id: pending.item.id, action: pending.kind, reason }).unwrap();
        toast.success(t("attachments.decided"));
      }
      return true;
    } catch (error) {
      toast.error(tc(`errors.${chatErrorKey(error)}`));
      return false;
    }
  };

  return (
    <>
      <ul
        className="divide-y divide-border/60 overflow-hidden rounded-xl bg-card"
        aria-label={t("attachments.results")}
      >
        {items.map((item) => {
          const blocked =
            item.scanStatus === ChatAttachmentScanStatus.INFECTED ||
            item.scanStatus === ChatAttachmentScanStatus.FAILED;
          const releasable = blocked && !(item.scanError && INTEGRITY_ERRORS.has(item.scanError));
          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:gap-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium" title={item.originalFilename}>
                    {item.originalFilename}
                  </span>
                  <ToneBadge tone={SCAN_TONE[item.scanStatus]}>
                    {t(`scanStatus.${item.scanStatus}`)}
                  </ToneBadge>
                  {item.messageDeleted ? (
                    <ToneBadge tone="neutral">{t("attachments.messageDeleted")}</ToneBadge>
                  ) : null}
                  {item.objectPurgedAt ? (
                    <ToneBadge tone="neutral">{t("attachments.purged")}</ToneBadge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[
                    item.mimeType,
                    formatBytes(item.sizeBytes, locale),
                    formatDateTime(item.createdAt, locale),
                    item.scanThreat ? t("attachments.threat", { name: item.scanThreat }) : null,
                    item.scanError ? t("attachments.scanError", { code: item.scanError }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {showConversationLink && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={ADMIN_ROUTES.communicationThread(item.conversationId)}>
                      {t("reports.open")}
                    </Link>
                  </Button>
                )}
                {canAccess && !item.objectPurgedAt && item.status === "UPLOADED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPending({ kind: "download", item })}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("attachments.download")}
                  </Button>
                )}
                {canManage && releasable && (
                  <Button size="sm" onClick={() => setPending({ kind: "RELEASE", item })}>
                    {t("attachments.release")}
                  </Button>
                )}
                {canManage &&
                  item.scanStatus !== ChatAttachmentScanStatus.CLEAN &&
                  !item.objectPurgedAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPending({ kind: "RESCAN", item })}
                    >
                      {t("attachments.rescan")}
                    </Button>
                  )}
              </div>
            </li>
          );
        })}
      </ul>
      <ReasonDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending
            ? t(
                `attachments.${pending.kind === "download" ? "downloadTitle" : pending.kind === "RELEASE" ? "releaseTitle" : "rescanTitle"}`,
              )
            : ""
        }
        description={
          pending?.kind === "download"
            ? t("attachments.downloadWarning")
            : t("attachments.decisionDescription")
        }
        confirmLabel={
          pending
            ? t(
                `attachments.${pending.kind === "download" ? "download" : pending.kind === "RELEASE" ? "release" : "rescan"}`,
              )
            : ""
        }
        onSubmit={submit}
      />
    </>
  );
}
