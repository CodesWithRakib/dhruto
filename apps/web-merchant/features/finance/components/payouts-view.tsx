"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@dhruto/ui";
import { History, Smartphone, Building2, FileText } from "lucide-react";
import { type PayoutRequestItem } from "@dhruto/contracts";
import { useGetMyPayoutsQuery, useCancelPayoutMutation } from "../api/finance.api";
import { PayoutInvoiceDialog } from "./payout-invoice-dialog";
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
  const [invoicePayout, setInvoicePayout] = React.useState<PayoutRequestItem | null>(null);
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
    <div className="space-y-4">
      {/* Responsive Table for desktop & tablet */}
      <div className="overflow-hidden rounded-3xl bg-surface-elevated p-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-inverse">
              <TableRow className="hover:bg-transparent">
                <TableHead className="rounded-l-2xl font-semibold text-inverse-foreground">{t("payout.payoutCode")}</TableHead>
                <TableHead className="font-semibold text-inverse-foreground">{t("date")}</TableHead>
                <TableHead className="font-semibold text-inverse-foreground">{t("payout.destination")}</TableHead>
                <TableHead className="font-semibold text-inverse-foreground">{t("reference")}</TableHead>
                <TableHead className="text-right font-semibold text-inverse-foreground">{t("statement.net")}</TableHead>
                <TableHead className="text-center font-semibold text-inverse-foreground">{t("status")}</TableHead>
                <TableHead className="rounded-r-2xl text-right font-semibold text-inverse-foreground">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id} className="hover:bg-surface-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-surface-muted">
                        {payout.payoutMethod === "BANK_TRANSFER" ? (
                          <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        ) : (
                          <Smartphone className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        )}
                      </span>
                      <span>{payout.payoutCode}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(payout.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{tMethod(payout.payoutMethod)}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {payout.accountDetails.accountNumber}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {payout.transactionReference ? (
                      <span className="font-semibold text-primary">{payout.transactionReference}</span>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">—</span>
                    )}
                    {payout.rejectionReason && (
                      <p className="text-[11px] text-danger">{payout.rejectionReason}</p>
                    )}
                    {payout.failureReason && (
                      <p className="text-[11px] text-danger">{payout.failureReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold tabular-nums text-foreground">
                    {bdt(Number(payout.amount))}
                  </TableCell>
                  <TableCell className="text-center">
                    <EnumBadge
                      namespace="PayoutStatus"
                      value={payout.status}
                      tones={PAYOUT_STATUS_TONE}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {payout.status === "REQUESTED" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-xl bg-danger-soft text-danger hover:bg-danger-soft/80 text-xs font-medium"
                          onClick={() => setCancelling(payout)}
                        >
                          {t("cancel")}
                        </Button>
                      ) : null}
                      {payout.status === "COMPLETED" || payout.status === "APPROVED" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 rounded-xl bg-surface-muted text-xs font-medium hover:bg-surface-muted/80"
                          onClick={() => setInvoicePayout(payout)}
                        >
                          <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          {t("invoice.viewReceipt")}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

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

      <PayoutInvoiceDialog
        open={invoicePayout !== null}
        onOpenChange={(open) => !open && setInvoicePayout(null)}
        payout={invoicePayout}
      />
    </div>
  );
}
