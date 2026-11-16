"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@dhruto/ui";

interface TransactionReversalDialogProps {
  reverseId: string | null;
  reverseReason: string;
  setReverseReason: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isReversing: boolean;
}

export function TransactionReversalDialog({
  reverseId,
  reverseReason,
  setReverseReason,
  onClose,
  onConfirm,
  isReversing,
}: TransactionReversalDialogProps) {
  const t = useTranslations("Finance");

  return (
    <Dialog open={reverseId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-surface-elevated rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("admin.reverseTitle")}</DialogTitle>
          <DialogDescription>{t("admin.reverseMessage")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="reverse-reason" className="text-xs font-bold text-foreground">
            {t("admin.adjustReason")} *
          </label>
          <Input
            id="reverse-reason"
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            maxLength={500}
            placeholder={t("admin.form.reverseReasonPlaceholder")}
            required
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isReversing || reverseReason.trim().length < 5}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
