"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Submit label, e.g. "Save changes". */
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: () => void | Promise<void>;
  loading?: boolean;
  /** Server-side error surfaced under the form. Callers pass translated text. */
  error?: string | null;
  /** Disable submit beyond loading, e.g. invalid form. */
  submitDisabled?: boolean;
}

/**
 * Standard create/edit dialog: title hierarchy, form content, server error
 * slot, loading submit. Mobile-safe (scrollable, near-full width).
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel,
  cancelLabel = "Cancel",
  onSubmit,
  loading,
  error,
  submitDisabled,
}: FormDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => cancelRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-h3">{title}</DialogTitle>
          {description ? <DialogDescription className="pt-1">{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {children}
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 pt-2">
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" size="sm" disabled={loading || submitDisabled} loading={loading}>
              {!loading ? null : <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
