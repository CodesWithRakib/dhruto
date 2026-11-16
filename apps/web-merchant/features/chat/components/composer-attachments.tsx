"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Image as ImageIcon, Mic, RotateCw, X } from "lucide-react";
import { Button, cn } from "@dhruto/ui";
import { chatAttachmentKind } from "@dhruto/contracts";
import { formatBytes } from "../lib/upload";
import { type AttachmentDraft } from "../hooks/use-attachment-uploads";

const ICONS = { image: ImageIcon, document: FileText, audio: Mic } as const;

/**
 * Attachment drafts above the composer: name, size, progress, verifying,
 * failure with retry, and removal. Filenames render as text (never HTML).
 */
export function ComposerAttachments({
  drafts,
  onRetry,
  onRemove,
}: {
  drafts: readonly AttachmentDraft[];
  onRetry: (localId: string) => void;
  onRemove: (localId: string) => void;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  if (drafts.length === 0) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-2" aria-label={t("attachments.listLabel")}>
      {drafts.map((draft) => {
        const Icon = ICONS[chatAttachmentKind(draft.mimeType)];
        const percent = Math.round(draft.progress * 100);
        return (
          <li
            key={draft.localId}
            className={cn(
              "relative flex w-56 max-w-full items-center gap-2 overflow-hidden rounded-xl bg-muted px-3 py-2 text-xs",
              draft.status === "failed" && "bg-danger-soft",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground" title={draft.name}>
                {draft.name}
              </p>
              <p className="text-muted-foreground" aria-live="polite">
                {draft.status === "failed"
                  ? t(draft.error === "uploadFailed" || !draft.error ? "attachments.uploadFailed" : `errors.${draft.error}`)
                  : draft.status === "uploading"
                    ? t("attachments.uploading", { percent })
                    : draft.status === "verifying" || draft.status === "preparing"
                      ? t("attachments.verifying")
                      : formatBytes(draft.size, locale)}
              </p>
            </div>
            {draft.status === "failed" && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onRetry(draft.localId)}
                aria-label={t("attachments.retry", { name: draft.name })}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onRemove(draft.localId)}
              aria-label={t("attachments.remove", { name: draft.name })}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            {draft.status === "uploading" && (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transition-[width]"
                style={{ width: `${percent}%` }}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("attachments.progressLabel", { name: draft.name })}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
