"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileText, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from "@dhruto/ui";
import { type ChatAttachmentItem } from "@dhruto/contracts";
import { useGetAttachmentDownloadQuery, useLazyGetAttachmentFileQuery } from "../api/chat.api";
import { chatErrorKey } from "../lib/errors";
import { formatBytes } from "../lib/upload";
import { formatDuration } from "./voice-recorder-bar";
import { AttachmentSecurityGate } from "./attachment-security-gate";

/**
 * Attachment rendering (Phase 6; Phase 7 wraps each file in the malware-scan gate). Media bytes are fetched only through
 * short-lived authorized URLs from the API (never stored links); an expired
 * URL is refetched on error. Images and audio display inline; documents are
 * offered as downloads (served with `Content-Disposition: attachment`).
 */
export function MessageAttachments({
  attachments,
  durationMs,
}: {
  attachments: readonly ChatAttachmentItem[];
  /** Voice duration from message metadata. */
  durationMs?: number;
}) {
  const images = attachments.filter((a) => a.kind === "image");
  const audio = attachments.filter((a) => a.kind === "audio");
  const documents = attachments.filter((a) => a.kind === "document");
  return (
    <div className="mb-1 space-y-1.5">
      {images.length > 0 && (
        <div className={cn("grid gap-1", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {images.map((attachment) => (
            <AttachmentSecurityGate key={attachment.id} attachment={attachment}>
              <AttachmentImage attachment={attachment} />
            </AttachmentSecurityGate>
          ))}
        </div>
      )}
      {audio.map((attachment) => (
        <AttachmentSecurityGate key={attachment.id} attachment={attachment}>
          <VoicePlayer attachment={attachment} durationMs={durationMs} />
        </AttachmentSecurityGate>
      ))}
      {documents.map((attachment) => (
        <AttachmentSecurityGate key={attachment.id} attachment={attachment}>
          <DocumentCard attachment={attachment} />
        </AttachmentSecurityGate>
      ))}
    </div>
  );
}

function AttachmentImage({ attachment }: { attachment: ChatAttachmentItem }) {
  const t = useTranslations("Chat");
  const { data, isError, refetch, isFetching } = useGetAttachmentDownloadQuery(attachment.id);
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);
  const retried = React.useRef(false);

  const onImageError = () => {
    // The authorized URL may have expired: fetch a fresh one once.
    if (!retried.current) {
      retried.current = true;
      void refetch();
      return;
    }
    setBroken(true);
  };

  if (isError || broken) {
    return (
      <div className="flex aspect-[4/3] w-full max-w-64 flex-col items-center justify-center gap-1 rounded-lg bg-muted text-xs text-muted-foreground">
        <ImageOff className="h-5 w-5" aria-hidden="true" />
        <span>{t("attachments.imageUnavailable")}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!data}
        className="group relative block w-full max-w-64 overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("attachments.openImage", { name: attachment.originalFilename })}
      >
        {data && !isFetching ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL; next/image would proxy and cache it
          <img
            src={data.url}
            alt={attachment.originalFilename}
            loading="lazy"
            decoding="async"
            onError={onImageError}
            className="max-h-72 w-full object-cover"
          />
        ) : (
          <span className="flex aspect-[4/3] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{t("attachments.loading")}</span>
          </span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(96vw,64rem)] p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle className="truncate text-sm">{attachment.originalFilename}</DialogTitle>
            <DialogDescription className="sr-only">{t("attachments.previewDescription")}</DialogDescription>
          </DialogHeader>
          {data && (
            // eslint-disable-next-line @next/next/no-img-element -- see above
            <img
              src={data.url}
              alt={attachment.originalFilename}
              className="max-h-[78vh] w-full rounded-md object-contain"
            />
          )}
          <DownloadButton attachment={attachment} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function VoicePlayer({ attachment, durationMs }: { attachment: ChatAttachmentItem; durationMs?: number }) {
  const t = useTranslations("Chat");
  const { data, isError, refetch } = useGetAttachmentDownloadQuery(attachment.id);
  if (isError) return <p className="text-xs text-muted-foreground">{t("attachments.audioUnavailable")}</p>;
  return (
    <div className="flex min-w-56 items-center gap-2">
      {data ? (
        <audio
          controls
          preload="none"
          src={data.url}
          onError={() => void refetch()}
          className="h-9 w-full max-w-72"
          aria-label={t("attachments.voiceLabel", { duration: formatDuration(durationMs ?? 0) })}
        />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t("attachments.loading")} />
      )}
      {durationMs ? <span className="shrink-0 text-xs tabular-nums opacity-80">{formatDuration(durationMs)}</span> : null}
    </div>
  );
}

function DocumentCard({ attachment }: { attachment: ChatAttachmentItem }) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  return (
    <div className="flex max-w-72 items-center gap-3 rounded-lg bg-background/60 px-3 py-2 text-foreground">
      <FileText className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={attachment.originalFilename}>
          {attachment.originalFilename}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("attachments.pdf")} · {formatBytes(attachment.sizeBytes, locale)}
        </p>
      </div>
      <DownloadButton attachment={attachment} iconOnly />
    </div>
  );
}

/** Fetches a fresh authorized download URL on click, then lets the browser save it. */
function DownloadButton({ attachment, iconOnly = false }: { attachment: ChatAttachmentItem; iconOnly?: boolean }) {
  const t = useTranslations("Chat");
  const [fetchUrl, { isFetching }] = useLazyGetAttachmentFileQuery();
  const label = t("attachments.download", { name: attachment.originalFilename });
  const onClick = async () => {
    try {
      const { url } = await fetchUrl(attachment.id, false).unwrap();
      const link = document.createElement("a");
      // Served with Content-Disposition: attachment, so the browser saves the
      // file and the messenger page stays where it is.
      link.href = url;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(t(`errors.${chatErrorKey(error)}`));
    }
  };
  return (
    <Button
      type="button"
      variant={iconOnly ? "ghost" : "secondary"}
      size={iconOnly ? "icon-sm" : "sm"}
      onClick={() => void onClick()}
      disabled={isFetching}
      aria-label={label}
    >
      {isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {!iconOnly && <span>{t("attachments.downloadShort")}</span>}
    </Button>
  );
}
