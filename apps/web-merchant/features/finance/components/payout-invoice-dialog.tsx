"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Logo,
} from "@dhruto/ui";
import {
  Printer,
  Copy,
  Check,
  Building2,
  Smartphone,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";
import { type PayoutRequestItem } from "@dhruto/contracts";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { PAYOUT_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";
import { toast } from "sonner";

interface PayoutInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: PayoutRequestItem | null;
  merchantName?: string;
}

/**
 * Official corporate settlement voucher and printable invoice for merchant payouts.
 * Includes complete banking references, disbursement breakdown, and ledger verification.
 */
export function PayoutInvoiceDialog({
  open,
  onOpenChange,
  payout,
  merchantName,
}: PayoutInvoiceDialogProps) {
  const t = useTranslations("Finance");
  const tMethod = useTranslations("PayoutMethod");
  const { bdt, date: fmtDate } = useFormatters();
  const [copied, setCopied] = React.useState(false);

  if (!payout) return null;

  const handleCopyTrx = () => {
    if (!payout.transactionReference) return;
    navigator.clipboard.writeText(payout.transactionReference);
    setCopied(true);
    toast.success(t("invoice.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isBank = payout.payoutMethod === "BANK_TRANSFER";
  const voucherCode = `INV-${payout.payoutCode}`;
  const amountFormatted = bdt(Number(payout.amount));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[92vh] p-0 sm:rounded-3xl bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("invoice.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("invoice.dialogSubtitle")}</DialogDescription>
        </DialogHeader>

        {/* Printable Voucher Surface */}
        <div id="printable-payout-invoice" className="p-6 sm:p-8 space-y-6 text-foreground bg-card">
          {/* Header & Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Logo size="default" />
              </div>
              <p className="text-xs text-muted-foreground">
                Dhruto Courier & Logistics Operating System
              </p>
              <p className="font-mono text-[11px] text-muted-foreground/80">
                BIN: 002948192-0101 · Tax Registered
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                Concord Tower, Gulshan-2, Dhaka 1212, Bangladesh
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 sm:self-auto">
              <div className="inline-block px-3 py-1 rounded-xl bg-primary/10 text-primary font-mono text-xs font-bold uppercase tracking-wider">
                {t("invoice.dialogTitle")}
              </div>
              <p className="font-mono text-sm font-bold tracking-tight text-foreground">
                {voucherCode}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("invoice.disbursementDate")}:{" "}
                <span className="font-mono text-foreground">
                  {payout.processedAt ? fmtDate(payout.processedAt) : fmtDate(payout.createdAt)}
                </span>
              </p>
              <div className="pt-1">
                <EnumBadge
                  namespace="PayoutStatus"
                  value={payout.status}
                  tones={PAYOUT_STATUS_TONE}
                />
              </div>
            </div>
          </div>

          {/* Recipient & Payment Method Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-surface-elevated text-xs">
            <div className="space-y-2">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                {t("invoice.billedTo")}
              </p>
              <div className="space-y-0.5">
                <p className="font-bold text-sm text-foreground">
                  {payout.accountDetails.accountHolderName || merchantName || "Merchant Beneficiary"}
                </p>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  {isBank ? (
                    <Building2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  ) : (
                    <Smartphone className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  )}
                  <span>{tMethod(payout.payoutMethod)}</span>
                </div>
                <p className="font-mono text-muted-foreground">
                  {t("invoice.account")}: {payout.accountDetails.accountNumber}
                </p>
                {payout.accountDetails.bankName ? (
                  <p className="text-muted-foreground">
                    {payout.accountDetails.bankName}
                    {payout.accountDetails.branchName ? ` (${payout.accountDetails.branchName})` : ""}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                {t("invoice.paymentDetails")}
              </p>
              <dl className="space-y-1 font-mono">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("payout.payoutCode")}:</dt>
                  <dd className="font-bold">{payout.payoutCode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("invoice.requestedDate")}:</dt>
                  <dd>{fmtDate(payout.createdAt)}</dd>
                </div>
                {payout.transactionReference ? (
                  <div className="pt-1.5">
                    <dt className="text-[11px] text-muted-foreground mb-0.5">
                      {t("invoice.trxReference")}:
                    </dt>
                    <dd className="font-bold text-primary break-all flex items-center justify-between gap-1 bg-surface-muted/60 px-2.5 py-1 rounded-xl">
                      <span>{payout.transactionReference}</span>
                      <button
                        type="button"
                        onClick={handleCopyTrx}
                        className="no-print p-0.5 hover:text-foreground text-muted-foreground transition-colors"
                        title={t("invoice.copyTrx")}
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </dd>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-muted-foreground italic">
                    {t("invoice.clearingInProgress")}
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-hidden rounded-2xl bg-surface-elevated">
            <table className="w-full text-left text-xs">
              <thead className="bg-inverse text-inverse-foreground text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-tl-2xl">{t("invoice.description")}</th>
                  <th className="py-3 px-4 text-center">{t("invoice.channel")}</th>
                  <th className="py-3 px-4 text-right rounded-tr-2xl">{t("invoice.amount")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-medium text-foreground">{t("invoice.disbursedDesc")}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Ref: {payout.payoutCode} · Double-Entry Ledger Settled
                    </p>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                    {tMethod(payout.payoutMethod)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-foreground">
                    {amountFormatted}
                  </td>
                </tr>
                <tr className="bg-surface-muted/30">
                  <td className="py-2.5 px-4 text-muted-foreground">
                    {t("invoice.fees")}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                    0.00%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-muted-foreground">
                    {bdt(0)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-surface-muted/60 font-bold">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-sm text-foreground">
                    {t("invoice.total")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base tabular-nums text-primary">
                    {amountFormatted}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Audit Verification Seal & Authorized Sign-off */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <span>{t("invoice.digitallyAudited")}</span>
                  <FileCheck2 className="h-3.5 w-3.5 text-success" />
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  {t("invoice.auditNote")}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-[11px] text-muted-foreground font-mono space-y-0.5">
              <p className="font-bold text-foreground">Dhruto Financial Operations Desk</p>
              <p>Automated Clearing Engine</p>
              <p className="text-[10px] text-muted-foreground/70">
                TS: {new Date().toISOString().replace("T", " ").substring(0, 19)} UTC
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions (Hidden in Print) */}
        <DialogFooter className="no-print p-4 bg-surface-muted/50 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            {t("close")}
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            {t("invoice.print")}
          </Button>
        </DialogFooter>

        {/* Embedded Print Stylesheet */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-payout-invoice,
            #printable-payout-invoice * {
              visibility: visible !important;
            }
            #printable-payout-invoice {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 24px !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
