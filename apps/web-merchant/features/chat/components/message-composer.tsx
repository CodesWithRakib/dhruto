"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { Button, cn } from "@dhruto/ui";
import {
  CHAT_ALLOWED_ATTACHMENT_MIME_TYPES,
  CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_UPLOAD_POLICY,
} from "@dhruto/contracts";
import { toast } from "sonner";
import { useAttachmentUploads } from "../hooks/use-attachment-uploads";
import { mediaTypeFor, type OutgoingMedia } from "../hooks/use-send-message";
import { ComposerAttachments } from "./composer-attachments";
import { VoiceRecorderBar } from "./voice-recorder-bar";

/**
 * Text field rule: at most CHAT_MESSAGE_MAX_LENGTH. Emptiness is checked at
 * submit, because a message with ready attachments may have no text (the
 * backend TEXT rule — trimmed, non-empty — still applies to text-only sends).
 */
const composerSchema = z.object({
  content: z.string().max(CHAT_MESSAGE_MAX_LENGTH),
});

const ACCEPT = CHAT_ALLOWED_ATTACHMENT_MIME_TYPES.filter((type) => !type.startsWith("audio/")).join(",");

/** Guidance derived from the shared upload policy (never hardcoded twice). */
const HINT_LIMITS = {
  imageMb: CHAT_UPLOAD_POLICY["image/jpeg"].maxBytes / (1024 * 1024),
  pdfMb: CHAT_UPLOAD_POLICY["application/pdf"].maxBytes / (1024 * 1024),
  max: CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
};

type ComposerValues = z.infer<typeof composerSchema>;

const COUNTER_THRESHOLD = 200;
const MAX_TEXTAREA_PX = 160;

export interface ComposerReply {
  messageId: string;
  name: string;
  preview: string | null;
}

export interface MessageComposerProps {
  /** Null = the user may not write here; `disabledReason` explains why. */
  disabledReason: string | null;
  reply: ComposerReply | null;
  onCancelReply: () => void;
  /** `media` is present for image/file/voice messages (attachments already verified). */
  onSend: (content: string, replyToMessageId: string | null, media?: OutgoingMedia) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  /** Changes when switching conversations (resets the draft). */
  resetKey: string;
  /** Conversation that uploads are authorized for (Phase 6). */
  conversationId: string;
}

/**
 * Text composer. Enter sends, Shift+Enter inserts a newline (IME-safe).
 * Sending is optimistic: the input clears immediately and the pending bubble
 * carries retry state, so a slow network never blocks typing the next message.
 * Attachments (Phase 6): images/PDFs upload directly to storage with
 * progress, cancel and retry; the message can only be sent once every
 * attachment is verified by the server. Voice messages use the mic button.
 */
export function MessageComposer({
  disabledReason,
  reply,
  onCancelReply,
  onSend,
  onTyping,
  onStopTyping,
  resetKey,
  conversationId,
}: MessageComposerProps) {
  const t = useTranslations("Chat");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const form = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: { content: "" },
    mode: "onSubmit",
  });
  const content = form.watch("content");
  const remaining = CHAT_MESSAGE_MAX_LENGTH - content.length;
  const disabled = disabledReason !== null;
  const uploads = useAttachmentUploads(conversationId);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [emptyError, setEmptyError] = useState(false);
  const hasText = content.trim().length > 0;
  const attachmentsBlocking = uploads.busy || uploads.hasFailed;
  const canSend = (hasText || uploads.ready.length > 0) && !attachmentsBlocking && remaining >= 0;

  useEffect(() => {
    form.reset({ content: "" });
    setEmptyError(false);
  }, [resetKey, form]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [content]);

  useEffect(() => {
    if (reply) textareaRef.current?.focus();
  }, [reply]);

  const submit = form.handleSubmit(({ content: raw }) => {
    const text = raw.trim();
    const attachments = uploads.ready;
    // Incomplete or failed uploads block sending (never send a partial set).
    if (attachmentsBlocking) return;
    if (!text && attachments.length === 0) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);
    const replyTo = reply?.messageId ?? null;
    if (attachments.length > 0) {
      onSend(text, replyTo, { type: mediaTypeFor(attachments), attachments });
      uploads.clearSent();
    } else {
      onSend(text, replyTo);
    }
    onStopTyping();
    form.reset({ content: "" });
    textareaRef.current?.focus();
  });

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const result = uploads.add(Array.from(files));
    for (const rejected of result.rejected) {
      toast.error(t(`attachments.rejected.${rejected.violation}`, { name: rejected.name }));
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const sendVoice = useCallback(
    (media: OutgoingMedia) => onSend("", reply?.messageId ?? null, media),
    [onSend, reply],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
    if (event.key === "Escape" && reply) onCancelReply();
  };

  const { ref, onChange, ...field } = form.register("content", {
    onBlur: onStopTyping,
  });

  if (disabled) {
    return (
      <div className="bg-surface px-4 py-3 text-center text-sm text-muted-foreground" role="status">
        {disabledReason}
      </div>
    );
  }

  const error = form.formState.errors.content;
  const showEmpty = emptyError && !hasText && uploads.ready.length === 0;

  return (
    <form
      onSubmit={submit}
      className="relative bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4"
    >
      {reply && (
        <div className="mb-2 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("replyingTo", { name: reply.name })}</p>
            <p className="truncate text-muted-foreground">{reply.preview ?? t("originalUnavailable")}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onCancelReply} aria-label={t("cancelReply")}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      {!voiceActive && (
        <ComposerAttachments drafts={uploads.drafts} onRetry={uploads.retry} onRemove={uploads.remove} />
      )}
      <div className="flex items-end gap-2">
        {!voiceActive && (
          <>
            <input
              ref={fileInput}
              id="chat-composer-files"
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => onFiles(event.target.files)}
              aria-label={t("attachments.add")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => fileInput.current?.click()}
              aria-label={t("attachments.add")}
              title={t("attachments.hint", HINT_LIMITS)}
            >
              <Paperclip className="h-5 w-5" aria-hidden="true" />
            </Button>
            <label htmlFor="chat-composer" className="sr-only">
              {t("composerLabel")}
            </label>
            <textarea
              id="chat-composer"
              ref={(element) => {
                ref(element);
                textareaRef.current = element;
              }}
              rows={1}
              maxLength={CHAT_MESSAGE_MAX_LENGTH}
              placeholder={uploads.ready.length > 0 ? t("attachments.captionPlaceholder") : t("composerPlaceholder")}
              aria-describedby="chat-composer-hint"
              aria-invalid={Boolean(error) || showEmpty}
              onKeyDown={onKeyDown}
              onChange={(event) => {
                void onChange(event);
                if (event.target.value.trim()) onTyping();
              }}
              className={cn(
                "max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-2xl bg-background px-4 py-2.5 text-sm leading-relaxed",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              {...field}
            />
          </>
        )}
        {(voiceActive || (!hasText && uploads.drafts.length === 0)) && (
          <VoiceRecorderBar conversationId={conversationId} onSend={sendVoice} onActiveChange={setVoiceActive} />
        )}
        {!voiceActive && (
          <Button type="submit" size="icon" aria-label={t("send")} disabled={!canSend} className="rounded-full">
            <SendHorizontal className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <span id="chat-composer-hint" className="hidden sm:inline">
          {uploads.busy ? t("attachments.waitForUploads") : t("composerHint")}
        </span>
        {(error || showEmpty) && (
          <span role="alert" className="text-danger">
            {showEmpty ? t("emptyMessage") : t("tooLong")}
          </span>
        )}
        {remaining <= COUNTER_THRESHOLD && (
          <span className={cn("ms-auto", remaining < 0 && "text-danger")} aria-live="polite">
            {t("charactersLeft", { count: remaining })}
          </span>
        )}
      </div>
    </form>
  );
}
