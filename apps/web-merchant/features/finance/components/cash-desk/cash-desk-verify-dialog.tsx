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
  Input,
} from "@dhruto/ui";
import { useFormatters } from "@/lib/format";
import type { PendingReconciliationItem } from "@dhruto/contracts";

interface CashDeskVerifyDialogProps {
  verifying: PendingReconciliationItem | null;
  onClose: () => void;
  countedAmount: string;
  setCountedAmount: (val: string) => void;
  verifyNotes: string;
  setVerifyNotes: (val: string) => void;
  onVerify: () => void;
  isVerifying: boolean;
}

export function CashDeskVerifyDialog({
  verifying,
  onClose,
  countedAmount,
  setCountedAmount,
  verifyNotes,
  setVerifyNotes,
  onVerify,
  isVerifying,
}: CashDeskVerifyDialogProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  return (
    <Dialog open={verifying !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl bg-surface-elevated p-6">
        <DialogHeader>
          <DialogTitle>{t("cash.verifyTitle")}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {t("cash.verifyMessage")}
          </DialogDescription>
        </DialogHeader>
        {verifying ? (
          <div className="space-y-4 py-2">
            <dl className="space-y-2 rounded-2xl bg-surface-muted/60 p-4 font-mono text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{verifying.trackingCode}</dt>
                <dd className="font-bold tabular-nums text-foreground">{bdt(verifying.amount)}</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-muted-foreground">{t("settlements.netPayable")}</dt>
                <dd className="font-bold tabular-nums text-success">
                  {bdt(verifying.netPayable)}
                </dd>
              </div>
            </dl>
            <div className="space-y-1.5">
              <label
                htmlFor="counted-amount"
                className="text-xs font-semibold text-muted-foreground"
              >
                {t("cash.countedAmount")} *
              </label>
              <Input
                id="counted-amount"
                type="number"
                min={0}
                value={countedAmount}
                onChange={(event) => setCountedAmount(event.target.value)}
                className="h-12 rounded-xl bg-surface-muted/60 font-mono text-lg focus:bg-background"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="verify-notes"
                className="text-xs font-semibold text-muted-foreground"
              >
                {t("cash.verificationNotes")}
              </label>
              <Input
                id="verify-notes"
                value={verifyNotes}
                onChange={(event) => setVerifyNotes(event.target.value)}
                maxLength={500}
                className="rounded-xl bg-surface-muted/60 focus:bg-background"
              />
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl bg-surface-muted/60 hover:bg-surface-muted"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={onVerify}
            disabled={isVerifying}
            className="rounded-xl font-bold"
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
