"use client";

import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { SendHorizontal, X } from "lucide-react";
import { Button, cn } from "@dhruto/ui";
import { CHAT_MESSAGE_MAX_LENGTH } from "@dhruto/contracts";

/** Mirrors the backend TEXT rule (trimmed, 1..CHAT_MESSAGE_MAX_LENGTH). */
const composerSchema = z.object({
  content: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
});

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
  onSend: (content: string, replyToMessageId: string | null) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  /** Changes when switching conversations (resets the draft). */
  resetKey: string;
}

/**
 * Text composer. Enter sends, Shift+Enter inserts a newline (IME-safe).
 * Sending is optimistic: the input clears immediately and the pending bubble
 * carries retry state, so a slow network never blocks typing the next message.
 * Attachment controls are intentionally absent until the upload service
 * exists (Phase 6) — no non-functional buttons.
 */
export function MessageComposer({
  disabledReason,
  reply,
  onCancelReply,
  onSend,
  onTyping,
  onStopTyping,
  resetKey,
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

  useEffect(() => {
    form.reset({ content: "" });
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

  const submit = form.handleSubmit(({ content: text }) => {
    onSend(text, reply?.messageId ?? null);
    onStopTyping();
    form.reset({ content: "" });
    textareaRef.current?.focus();
  });

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
      <div className="border-t border-border bg-surface px-4 py-3 text-center text-sm text-muted-foreground" role="status">
        {disabledReason}
      </div>
    );
  }

  const error = form.formState.errors.content;

  return (
    <form onSubmit={submit} className="border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
      {reply && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-s-2 border-primary bg-muted px-3 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("replyingTo", { name: reply.name })}</p>
            <p className="truncate text-muted-foreground">{reply.preview ?? t("originalUnavailable")}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onCancelReply} aria-label={t("cancelReply")}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
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
          placeholder={t("composerPlaceholder")}
          aria-describedby="chat-composer-hint"
          aria-invalid={Boolean(error)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            void onChange(event);
            if (event.target.value.trim()) onTyping();
          }}
          className={cn(
            "max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm leading-relaxed",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          {...field}
        />
        <Button type="submit" size="icon" aria-label={t("send")} disabled={!content.trim() || remaining < 0} className="rounded-full">
          <SendHorizontal className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <span id="chat-composer-hint" className="hidden sm:inline">
          {t("composerHint")}
        </span>
        {error && (
          <span role="alert" className="text-danger">
            {content.trim().length === 0 ? t("emptyMessage") : t("tooLong")}
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
