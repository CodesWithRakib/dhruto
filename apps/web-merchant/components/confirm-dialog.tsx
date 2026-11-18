"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, TriangleAlert, Info } from "lucide-react";
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
 * Shared destructive/confirmation modal built on shadcn Dialog.
 * Replaces native `confirm()`: accessible, localized, prevents duplicate
 * submits (button disables while `loading`), and surfaces async errors via
 * the caller's toast. Mobile: full-width action buttons.
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
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-6 sm:p-7 rounded-3xl">
        <DialogHeader className="gap-3">
          <div className="flex items-start gap-3.5">
            {tone === "danger" ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger">
                <TriangleAlert className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Info className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground leading-snug">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger-soft-foreground"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelRef}
            variant="outline"
            className="w-full sm:w-auto h-10 px-5 text-xs font-semibold"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            className="w-full sm:w-auto h-10 px-5 text-xs font-semibold"
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
