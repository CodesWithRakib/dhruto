"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button } from "@dhruto/ui";
import { History, Smartphone, Building2 } from "lucide-react";
import { type PayoutRequestItem } from "@dhruto/contracts";
import { useGetMyPayoutsQuery, useCancelPayoutMutation } from "../api/finance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { PAYOUT_STATUS_TONE } from "@/config/status";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";

/** Merchant payout history with cancel flow for pending requests. */
export function PayoutsView({ onChanged }: { onChanged: () => void }) {
  const t = useTranslations("Finance");
  const tMethod = useTranslations("PayoutMethod");
  const { bdt, date: fmtDate } = useFormatters();
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
    return (
      <EmptyState
        icon={History}
        title={t("payout.empty")}
        description={t("payout.emptyDescription")}
      />
    );
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
                {tMethod(payout.payoutMethod)}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {payout.payoutCode}
              </span>
              <span className="ml-auto font-mono text-sm font-bold tabular-nums">
                {bdt(Number(payout.amount))}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {t("payout.destination")}: {payout.accountDetails.accountNumber}
              </span>
              <span>{fmtDate(payout.createdAt)}</span>
              <span className="ml-auto">
                <EnumBadge
                  namespace="PayoutStatus"
                  value={payout.status}
                  tones={PAYOUT_STATUS_TONE}
                />
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setCancelling(payout)}
                >
                  {t("cancel")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        tone="danger"
        title={t("payout.cancelTitle")}
        description={
          cancelling
            ? `${t("payout.cancelMessage")} ${bdt(Number(cancelling.amount))} · ${cancelling.payoutCode}`
            : t("payout.cancelMessage")
        }
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        loading={isCancelling}
        onConfirm={handleCancel}
      />
    </div>
  );
}
