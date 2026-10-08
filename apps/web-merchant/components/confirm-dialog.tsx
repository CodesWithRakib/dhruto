"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Shared destructive-action confirmation built on shadcn Dialog.
 * Replaces native `confirm()`: accessible, localized, prevents duplicate
 * submits (button disables while `loading`), and surfaces async errors via
 * the caller's toast. Mobile: full-width sheet-like content.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations("ConfirmDialog");
  const [error, setError] = React.useState<string | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
      const frame = requestAnimationFrame(() => cancelRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open]);

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-h3">
            {tone === "danger" ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger-soft-foreground">
                <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : null}
            {title}
          </DialogTitle>
          {description ? <DialogDescription className="pt-1">{description}</DialogDescription> : null}
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelRef}
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            {confirmLabel ?? t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
