"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import { History, Smartphone, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { type PayoutRequestItem } from "@dhruto/contracts";
import { useGetMyPayoutsQuery, useCancelPayoutMutation } from "../api/finance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-success bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {status}
        </span>
      );
    case "REJECTED":
    case "FAILED":
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-danger bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {status}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-warning bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {status}
        </span>
      );
  }
}

/** Merchant payout history with cancel flow for pending requests. */
export function PayoutsView({ onChanged }: { onChanged: () => void }) {
  const t = useTranslations("Finance");
  const [cancelling, setCancelling] = React.useState<PayoutRequestItem | null>(null);
  const { data, isLoading, refetch } = useGetMyPayoutsQuery();
  const [cancelPayout, { isLoading: isCancelling }] = useCancelPayoutMutation();
  const payouts = data?.data ?? [];

  const handleCancel = async () => {
    if (!cancelling) return;
    try {
      const res = await cancelPayout(cancelling.id).unwrap();
      if (res.success) {
        toast.success(res.message);
        setCancelling(null);
        refetch();
        onChanged();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("payout.cancelTitle")));
    }
  };

  if (isLoading) {
    return (
      <p role="status" className="py-12 text-center text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }

  if (payouts.length === 0) {
    return <EmptyState icon={History} title={t("payout.empty")} description={t("payout.emptyDescription")} />;
  }

  return (
    <div className="space-y-3">
      {payouts.map((payout) => (
        <Card key={payout.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                {payout.payoutMethod === "BANK_TRANSFER" ? (
                  <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                ) : (
                  <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />
                )}
                {payout.payoutMethod}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{payout.payoutCode}</span>
              <span className="ml-auto font-mono text-sm font-bold tabular-nums">
                ৳{Number(payout.amount).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {t("payout.destination")}: {payout.accountDetails.accountNumber}
              </span>
              <span>{new Date(payout.createdAt).toLocaleDateString()}</span>
              <span className="ml-auto">
                <StatusBadge status={payout.status} />
              </span>
            </div>
            {payout.transactionReference ? (
              <p className="font-mono text-[11px] text-primary">
                {t("reference")}: {payout.transactionReference}
              </p>
            ) : null}
            {payout.rejectionReason ? (
              <p className="text-[11px] text-danger">{payout.rejectionReason}</p>
            ) : null}
            {payout.failureReason ? (
              <p className="text-[11px] text-danger">{payout.failureReason}</p>
            ) : null}
            {payout.status === "REQUESTED" ? (
              <div className="pt-1">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCancelling(payout)}>
                  {t("cancel")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Dialog open={cancelling !== null} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("payout.cancelTitle")}</DialogTitle>
            <DialogDescription>{t("payout.cancelMessage")}</DialogDescription>
          </DialogHeader>
          {cancelling ? (
            <p className="font-mono text-sm font-bold tabular-nums">
              ৳{Number(cancelling.amount).toLocaleString()} · {cancelling.payoutCode}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelling(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleCancel} disabled={isCancelling}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
