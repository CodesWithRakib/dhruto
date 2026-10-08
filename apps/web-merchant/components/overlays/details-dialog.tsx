"use client";

import * as React from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@dhruto/ui";

export interface DetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Optional primary action, e.g. "View full details". */
  actionLabel?: string;
  onAction?: () => void;
  closeLabel?: string;
  wide?: boolean;
}

/**
 * Quick-preview dialog for record details. Read-only content with an
 * optional action; the full record lives on its own page.
 */
export function DetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actionLabel,
  onAction,
  closeLabel = "Close",
  wide,
}: DetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? "w-[calc(100vw-2rem)] max-w-2xl p-6" : "w-[calc(100vw-2rem)] max-w-lg p-6"}>
        <DialogHeader>
          <DialogTitle className="text-h3">{title}</DialogTitle>
          {description ? <DialogDescription className="pt-1">{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
          {actionLabel && onAction ? (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
