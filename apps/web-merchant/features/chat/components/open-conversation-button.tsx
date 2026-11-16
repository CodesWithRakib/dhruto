"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Headset, Loader2, MessageCircle } from "lucide-react";
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
import { adminChatInterveneSchema, type AdminChatInterveneRequest } from "@dhruto/contracts";
import { useOpenConversation, type ConversationTarget } from "../hooks/use-open-conversation";

type ButtonProps = React.ComponentProps<typeof Button>;

interface OpenConversationButtonProps {
  target: ConversationTarget;
  /** Visible label; defaults to "Message about this parcel" / "Contact operations". */
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/**
 * Button that opens (get-or-create) the conversation for a backend-defined
 * context and navigates to it. Visibility is UX only — the API decides
 * whether the caller may access the parcel or merchant desk, and an
 * inaccessible context shows a neutral "not available" message.
 */
export function OpenConversationButton({
  target,
  label,
  variant = "outline",
  size = "sm",
  className,
}: OpenConversationButtonProps) {
  const t = useTranslations("Chat");
  const { open, pending } = useOpenConversation();
  const [reasonOpen, setReasonOpen] = useState(false);
  const Icon = target.kind === "parcel" ? MessageCircle : Headset;
  const text = label ?? (target.kind === "parcel" ? t("openParcelChat") : t("contactOperations"));

  const onClick = async () => {
    if ((await open(target)) === "needsReason") setReasonOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={onClick}
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="h-4 w-4" aria-hidden="true" />
        )}
        {text}
      </Button>
      <StaffReasonDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        onSubmit={async (reason) => (await open(target, reason)) === "opened"}
      />
    </>
  );
}

/** Staff must justify joining an existing conversation (stored in the audit log). */
export function StaffReasonDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<boolean>;
}) {
  const t = useTranslations("Chat");
  const form = useForm<AdminChatInterveneRequest>({
    resolver: zodResolver(adminChatInterveneSchema),
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
            <DialogTitle>{t("staffJoinTitle")}</DialogTitle>
            <DialogDescription>{t("staffJoinDescription")}</DialogDescription>
          </DialogHeader>
          <Label htmlFor="chat-staff-reason">{t("staffJoinReason")}</Label>
          <Textarea id="chat-staff-reason" rows={3} {...form.register("reason")} />
          {form.formState.errors.reason && (
            <p role="alert" className="text-xs text-danger">
              {t("staffJoinReasonHint")}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t("staffJoinConfirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
