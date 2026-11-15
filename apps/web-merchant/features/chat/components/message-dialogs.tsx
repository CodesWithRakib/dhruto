"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@dhruto/ui";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  ChatReportReason,
  editChatMessageSchema,
  removeChatMessageSchema,
  reportChatMessageSchema,
  type EditChatMessageRequest,
  type RemoveChatMessageRequest,
  type ReportChatMessageRequest,
} from "@dhruto/contracts";

/* The dialogs validate with the SAME zod schemas the backend enforces. */

interface DialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMessageDialog({
  open,
  onOpenChange,
  initialContent,
  onSubmit,
}: DialogBaseProps & { initialContent: string; onSubmit: (content: string) => Promise<boolean> }) {
  const t = useTranslations("Chat");
  const form = useForm<EditChatMessageRequest>({
    resolver: zodResolver(editChatMessageSchema),
    values: { content: initialContent },
  });
  const submit = form.handleSubmit(async ({ content }) => {
    if (await onSubmit(content)) onOpenChange(false);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="chat-edit-content" className="sr-only">
            {t("composerLabel")}
          </Label>
          <Textarea
            id="chat-edit-content"
            rows={4}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            aria-invalid={Boolean(form.formState.errors.content)}
            {...form.register("content")}
          />
          {form.formState.errors.content && (
            <p role="alert" className="text-xs text-danger">
              {t("emptyMessage")}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveMessageDialog({
  open,
  onOpenChange,
  onSubmit,
}: DialogBaseProps & { onSubmit: (reason: string) => Promise<boolean> }) {
  const t = useTranslations("Chat");
  const form = useForm<RemoveChatMessageRequest>({
    resolver: zodResolver(removeChatMessageSchema),
    defaultValues: { reason: "" },
  });
  const submit = form.handleSubmit(async ({ reason }) => {
    if (await onSubmit(reason)) {
      form.reset();
      onOpenChange(false);
    }
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("removeTitle")}</DialogTitle>
            <DialogDescription>{t("removeReasonHint")}</DialogDescription>
          </DialogHeader>
          <Label htmlFor="chat-remove-reason">{t("removeReason")}</Label>
          <Textarea id="chat-remove-reason" rows={3} {...form.register("reason")} />
          {form.formState.errors.reason && (
            <p role="alert" className="text-xs text-danger">
              {t("removeReasonHint")}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
              {t("removeConfirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReportMessageDialog({
  open,
  onOpenChange,
  onSubmit,
}: DialogBaseProps & { onSubmit: (reason: ChatReportReason, details?: string) => Promise<boolean> }) {
  const t = useTranslations("Chat");
  const form = useForm<ReportChatMessageRequest>({
    resolver: zodResolver(reportChatMessageSchema),
    defaultValues: { reason: ChatReportReason.SPAM, details: "" },
  });
  const submit = form.handleSubmit(async ({ reason, details }) => {
    if (await onSubmit(reason, details?.trim() || undefined)) {
      form.reset();
      onOpenChange(false);
    }
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("reportTitle")}</DialogTitle>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("reportReason")}</legend>
            {Object.values(ChatReportReason).map((reason) => (
              <label key={reason} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" value={reason} className="accent-primary" {...form.register("reason")} />
                {t(`reportReasons.${reason}`)}
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="chat-report-details">{t("reportDetails")}</Label>
            <Textarea id="chat-report-details" rows={3} maxLength={1000} {...form.register("details")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t("reportSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
