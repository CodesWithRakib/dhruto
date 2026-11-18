"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";

interface BagSealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sealTagInput: string;
  setSealTagInput: (val: string) => void;
  onConfirm: () => void;
  isSealing: boolean;
}

export function BagSealDialog({
  open,
  onOpenChange,
  sealTagInput,
  setSealTagInput,
  onConfirm,
  isSealing,
}: BagSealDialogProps) {
  const t = useTranslations("Hub");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-surface-elevated p-6">
        <DialogHeader>
          <DialogTitle>{t("bags.sealConfirmTitle")}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {t("bags.sealConfirmMessage")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-3">
          <label htmlFor="seal-tag-input" className="text-xs font-semibold text-muted-foreground">
            {t("bags.sealTag")} *
          </label>
          <input
            id="seal-tag-input"
            type="text"
            value={sealTagInput}
            onChange={(event) => setSealTagInput(event.target.value)}
            placeholder={t("bags.sealTagPlaceholder")}
            maxLength={100}
            className="w-full rounded-2xl bg-field p-3.5 font-mono text-sm uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-xs placeholder:text-muted-foreground outline-none focus:bg-background hover:bg-field-hover"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSealing}
            className="rounded-xl font-semibold"
          >
            {isSealing ? t("bags.sealing") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
