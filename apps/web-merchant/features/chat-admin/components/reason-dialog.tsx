"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
import { CHAT_REASON_MAX_LENGTH, CHAT_REASON_MIN_LENGTH } from "@dhruto/contracts";

/**
 * Collects a mandatory staff justification (same bounds as the backend
 * `chatReasonSchema`). The reason is sent to the API and recorded in the audit
 * log; it is never stored in the browser.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onSubmit,
  minLength = CHAT_REASON_MIN_LENGTH,
  maxLength = CHAT_REASON_MAX_LENGTH,
  optional = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  /** Resolve true to close the dialog. */
  onSubmit: (reason: string) => Promise<boolean>;
  minLength?: number;
  maxLength?: number;
  /** Allow an empty value (e.g. taking a case into review). */
  optional?: boolean;
}) {
  const t = useTranslations("ChatAdmin");
  const id = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  // The dialog is opened programmatically (no DialogTrigger), so Radix has no
  // element to return focus to. Remember the opener before Radix moves focus
  // into the dialog (layout effects run before its focus effect) and restore
  // it on close — keyboard and screen-reader users keep their place.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement)
      opener.current = document.activeElement;
  }, [open]);
  useEffect(() => {
    if (!open) setValue("");
  }, [open]);
  const restoreFocus = (event: Event) => {
    const target = opener.current;
    if (target && document.contains(target)) {
      event.preventDefault();
      target.focus();
    }
  };

  const trimmed = value.trim();
  const valid =
    (optional && trimmed.length === 0) ||
    (trimmed.length >= minLength && trimmed.length <= maxLength);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (await onSubmit(trimmed)) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onCloseAutoFocus={restoreFocus}>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={id}>{t("reason.label")}</Label>
            <Textarea
              id={id}
              rows={3}
              value={value}
              maxLength={maxLength}
              onChange={(event) => setValue(event.target.value)}
              aria-describedby={`${id}-hint`}
              autoFocus
            />
            <p id={`${id}-hint`} className="text-xs text-muted-foreground">
              {optional
                ? t("reason.optionalHint", { min: minLength })
                : t("reason.hint", { min: minLength })}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
