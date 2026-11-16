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
import type { PayoutRequestItem } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

interface PayoutDecisionDialogProps {
  payout: PayoutRequestItem | null;
  decision: "approve" | "complete" | "reject" | "fail" | null;
  reference: string;
  setReference: (ref: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function PayoutDecisionDialog({
  payout,
  decision,
  reference,
  setReference,
  reason,
  setReason,
  onClose,
  onConfirm,
  isProcessing,
}: PayoutDecisionDialogProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  return (
    <Dialog open={payout !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-surface-elevated rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {decision === "approve"
              ? t("payout.approveTitle")
              : decision === "reject"
                ? t("payout.rejectTitle")
                : decision === "fail"
                  ? t("payout.failTitle")
                  : t("payout.processTitle")}
          </DialogTitle>
          <DialogDescription>
            {decision === "approve"
              ? t("payout.approveMessage")
              : decision === "reject"
                ? t("payout.rejectMessage")
                : decision === "fail"
                  ? t("payout.failMessage")
                  : t("payout.processMessage")}
          </DialogDescription>
        </DialogHeader>

        {payout ? (
          <dl className="space-y-2 rounded-2xl bg-surface-muted/60 p-4 font-mono text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("payout.payoutCode")}</dt>
              <dd className="font-bold text-foreground">{payout.payoutCode}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("payout.requestedAmount")}</dt>
              <dd className="font-bold text-foreground tabular-nums">
                {bdt(Number(payout.amount))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("payout.destination")}</dt>
              <dd className="text-foreground">{payout.accountDetails?.accountNumber || "—"}</dd>
            </div>
          </dl>
        ) : null}

        {decision === "complete" ? (
          <div className="space-y-1.5">
            <label htmlFor="payout-reference" className="text-xs font-bold text-foreground">
              {t("payout.providerReference")}
            </label>
            <Input
              id="payout-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={100}
              placeholder="e.g. BEFTN-2026-981723 or bKash TrxID 9K28A7Z1"
            />
            <p className="text-[11px] text-muted-foreground">
              {t("admin.form.referenceHelper")}
            </p>
          </div>
        ) : null}

        {decision === "reject" || decision === "fail" ? (
          <div className="space-y-1.5">
            <label htmlFor="payout-reason" className="text-xs font-bold text-foreground">
              {decision === "reject" ? t("payout.rejectReason") : t("payout.failureReason")} *
            </label>
            <Input
              id="payout-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isProcessing}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
