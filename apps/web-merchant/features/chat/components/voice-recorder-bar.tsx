"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mic, RotateCw, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@dhruto/ui";
import { ChatMessageType, type ChatAttachmentItem } from "@dhruto/contracts";
import { useAttachmentUploads } from "../hooks/use-attachment-uploads";
import { useVoiceRecorder } from "../hooks/use-voice-recorder";
import { type OutgoingMedia } from "../hooks/use-send-message";

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Voice message control (Phase 6). Idle: a mic button (no permission is
 * requested until it is pressed). Recording: elapsed time, cancel and
 * stop-and-send. Then the clip is uploaded and verified like any attachment
 * and sent as a VOICE message; failures can be retried or discarded.
 */
export function VoiceRecorderBar({
  conversationId,
  onSend,
  onActiveChange,
}: {
  conversationId: string;
  onSend: (media: OutgoingMedia) => void;
  /** True while recording/uploading, so the composer hides the text row. */
  onActiveChange: (active: boolean) => void;
}) {
  const t = useTranslations("Chat");
  const recorder = useVoiceRecorder();
  const uploads = useAttachmentUploads(conversationId);
  const [duration, setDuration] = useState(0);
  const sentFor = useRef<string | null>(null);
  const draft = uploads.drafts[0] ?? null;
  const active = recorder.state === "recording" || recorder.state === "requesting" || draft !== null;

  useEffect(() => onActiveChange(active), [active, onActiveChange]);

  // Send automatically once the clip is verified (once per attachment).
  useEffect(() => {
    if (draft?.status !== "ready" || !draft.attachment || sentFor.current === draft.attachment.id) return;
    sentFor.current = draft.attachment.id;
    const attachment: ChatAttachmentItem = draft.attachment;
    onSend({ type: ChatMessageType.VOICE, attachments: [attachment], metadata: { durationMs: duration } });
    uploads.clearSent();
  }, [draft, duration, onSend, uploads]);

  const stopAndSend = async () => {
    const recording = await recorder.stop();
    if (!recording) return;
    setDuration(recording.durationMs);
    const result = uploads.add([{ blob: recording.blob, name: recording.filename }]);
    if (result.added === 0) setDuration(0);
  };

  const notice =
    recorder.state === "unsupported"
      ? t("voice.unsupported")
      : recorder.state === "denied"
        ? t("voice.denied")
        : recorder.state === "error"
          ? t("voice.error")
          : null;

  if (draft) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm" role="status" aria-live="polite">
        {draft.status === "failed" ? (
          <>
            <span className="flex-1 text-danger">{t("voice.uploadFailed")}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => uploads.retry(draft.localId)} aria-label={t("voice.retry")}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => uploads.remove(draft.localId)} aria-label={t("voice.discard")}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">{t("voice.sending", { duration: formatDuration(duration) })}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => uploads.remove(draft.localId)} aria-label={t("voice.discard")}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    );
  }

  if (recorder.state === "recording" || recorder.state === "requesting") {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-2xl bg-danger-soft px-3 py-1.5 text-sm" role="status" aria-live="polite">
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden="true" />
        <span className="flex-1 tabular-nums">
          {recorder.state === "requesting" ? t("voice.requesting") : t("voice.recording", { duration: formatDuration(recorder.elapsedMs) })}
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={recorder.cancel} aria-label={t("voice.cancel")}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          onClick={() => void stopAndSend()}
          disabled={recorder.state !== "recording"}
          aria-label={t("voice.stopAndSend")}
          className="rounded-full"
        >
          {recorder.state === "recording" ? <Send className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          recorder.reset();
          void recorder.start();
        }}
        aria-label={t("voice.record")}
        title={notice ?? t("voice.record")}
        className="rounded-full"
      >
        <Mic className="h-5 w-5" aria-hidden="true" />
      </Button>
      {notice && <VoiceNotice text={notice} />}
    </>
  );
}

function VoiceNotice({ text }: { text: string }) {
  return <span role="alert" className="absolute -top-6 end-3 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{text}</span>;
}
