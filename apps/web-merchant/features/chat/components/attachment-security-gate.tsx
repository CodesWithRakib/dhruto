"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { ApiErrorCode, ChatAttachmentScanStatus, type ChatAttachmentItem } from "@dhruto/contracts";
import { useGetAttachmentDownloadQuery } from "../api/chat.api";

/** While a file is being scanned, re-ask the server at this interval. */
const SCAN_POLL_MS = 10_000;

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("data" in error)) return null;
  const data = error.data;
  return typeof data === "object" &&
    data !== null &&
    "errorCode" in data &&
    typeof data.errorCode === "string"
    ? data.errorCode
    : null;
}

/**
 * Phase 7 malware-scan gate for one attachment. CLEAN files render their
 * normal content immediately. Files still being scanned show a neutral
 * "security check" state and the server is polled until it answers with a
 * URL (scan clean) or "blocked". Blocked files never load content. The
 * server decides; this component only reflects its answer.
 */
export function AttachmentSecurityGate({
  attachment,
  children,
}: {
  attachment: ChatAttachmentItem;
  children: React.ReactNode;
}) {
  const t = useTranslations("Chat");
  const initiallyBlocked =
    attachment.scanStatus === ChatAttachmentScanStatus.INFECTED ||
    attachment.scanStatus === ChatAttachmentScanStatus.FAILED;
  const gated = attachment.scanStatus !== ChatAttachmentScanStatus.CLEAN && !initiallyBlocked;
  const [polling, setPolling] = useState(gated);
  const { data, error } = useGetAttachmentDownloadQuery(attachment.id, {
    skip: !gated,
    pollingInterval: polling ? SCAN_POLL_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const code = errorCode(error);
  const blocked = initiallyBlocked || code === ApiErrorCode.CHAT_ATTACHMENT_BLOCKED;

  useEffect(() => {
    if (data || blocked || (code && code !== ApiErrorCode.CHAT_ATTACHMENT_SCAN_PENDING))
      setPolling(false);
  }, [data, blocked, code]);

  if (!gated && !initiallyBlocked) return <>{children}</>;
  if (blocked) {
    return (
      <div
        role="status"
        className="flex max-w-72 items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
      >
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate font-medium" title={attachment.originalFilename}>
            {attachment.originalFilename}
          </span>
          {t("attachments.blocked")}
        </span>
      </div>
    );
  }
  if (data) return <>{children}</>;
  if (code && code !== ApiErrorCode.CHAT_ATTACHMENT_SCAN_PENDING) {
    return <p className="text-xs text-muted-foreground">{t("attachments.unavailable")}</p>;
  }
  return (
    <div
      role="status"
      className="flex max-w-72 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
    >
      <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span
          className="block truncate font-medium text-foreground"
          title={attachment.originalFilename}
        >
          {attachment.originalFilename}
        </span>
        {t("attachments.scanPending")}
      </span>
      <Loader2 className="ms-auto h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
    </div>
  );
}
