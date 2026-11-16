"use client";

import React, { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button, Label, Textarea } from "@dhruto/ui";
import { ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { chatErrorKey } from "@/features/chat/lib/errors";
import { useCreateNoteMutation, useGetNotesQuery } from "../../api/chat-admin.api";
import { formatDateTime } from "../../lib/admin";

const NOTE_MAX = 4000;

/**
 * Internal staff notes: stored separately from messages, served only by staff
 * endpoints, never broadcast to participants. Reading is audited server-side.
 */
export function NotesCard({ conversationId }: { conversationId: string }) {
  const t = useTranslations("ChatAdmin");
  const tc = useTranslations("Chat");
  const locale = useLocale();
  const id = useId();
  const { data, isLoading, isError, refetch } = useGetNotesQuery(conversationId);
  const [create, { isLoading: saving }] = useCreateNoteMutation();
  const [body, setBody] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      await create({ id: conversationId, body: text }).unwrap();
      setBody("");
    } catch (error) {
      toast.error(tc(`errors.${chatErrorKey(error)}`));
    }
  };

  return (
    <section aria-labelledby="ws-notes" className="space-y-3 rounded-xl bg-card p-4">
      <h2 id="ws-notes" className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4" aria-hidden="true" />
        {t("notes.title")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("notes.privacy")}</p>
      <form onSubmit={(event) => void submit(event)} className="space-y-2">
        <Label htmlFor={id} className="sr-only">
          {t("notes.add")}
        </Label>
        <Textarea
          id={id}
          rows={3}
          maxLength={NOTE_MAX}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("notes.placeholder")}
        />
        <Button type="submit" size="sm" disabled={saving || body.trim().length === 0}>
          {t("notes.add")}
        </Button>
      </form>
      {isLoading ? (
        <LoadingState title={t("loading")} />
      ) : isError || !data ? (
        <ErrorState
          title={t("errors.loadFailed")}
          action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
        />
      ) : data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("notes.empty")}</p>
      ) : (
        <ol className="space-y-2" aria-label={t("notes.title")}>
          {data.map((note) => (
            <li key={note.id} className="rounded-lg bg-surface-muted p-3 text-sm">
              <p className="whitespace-pre-wrap break-words">{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <time dateTime={note.createdAt}>{formatDateTime(note.createdAt, locale)}</time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
