"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dhruto/ui";
import { Building2, CheckCircle2, CreditCard, FileText } from "lucide-react";
import type { PayoutRequestItem } from "@dhruto/contracts";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { EmptyState } from "@/components/feedback/states";
import { PAYOUT_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

interface AdminPayoutsTabProps {
  payouts: PayoutRequestItem[];
  onApprove: (payout: PayoutRequestItem) => void;
  onComplete: (payout: PayoutRequestItem) => void;
  onFail: (payout: PayoutRequestItem) => void;
  onReject: (payout: PayoutRequestItem) => void;
  onViewVoucher: (payout: PayoutRequestItem) => void;
}

export function AdminPayoutsTab({
  payouts,
  onApprove,
  onComplete,
  onFail,
  onReject,
  onViewVoucher,
}: AdminPayoutsTabProps) {
  const t = useTranslations("Finance");
  const { bdt, date: fmtDate } = useFormatters();

  return (
    <Card className="rounded-3xl bg-surface-elevated overflow-hidden">
      <CardContent className="p-0">
        {payouts.length === 0 ? (
          <div className="p-10">
            <EmptyState icon={CheckCircle2} title={t("payout.empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-inverse text-inverse-foreground">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                    {t("admin.headers.payoutCode")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                    {t("admin.headers.date")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                    {t("admin.headers.methodAccount")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                    {t("admin.headers.reference")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground text-right">
                    {t("admin.headers.amount")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground text-center">
                    {t("admin.headers.status")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground text-right">
                    {t("admin.headers.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                      {payout.payoutCode}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(payout.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground">
                          {payout.payoutMethod === "BANK_TRANSFER" ? (
                            <Building2 className="h-3.5 w-3.5" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">
                            {payout.payoutMethod}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {payout.accountDetails?.accountNumber || "—"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-xs text-foreground whitespace-nowrap">
                      {payout.transactionReference ? (
                        <span className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-primary">
                          {payout.transactionReference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-sm font-bold tabular-nums text-foreground text-right whitespace-nowrap">
                      {bdt(Number(payout.amount))}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                      <EnumBadge
                        namespace="PayoutStatus"
                        value={payout.status}
                        tones={PAYOUT_STATUS_TONE}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {payout.status === "REQUESTED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold"
                            onClick={() => onApprove(payout)}
                          >
                            {t("payout.approve")}
                          </Button>
                        ) : null}
                        {payout.status === "APPROVED" || payout.status === "PROCESSING" ? (
                          <>
                            <Button
                              size="sm"
                              className="h-8 text-xs font-bold"
                              onClick={() => onComplete(payout)}
                            >
                              {t("confirm")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold text-danger hover:bg-danger-soft"
                              onClick={() => onFail(payout)}
                            >
                              {t("payout.failTitle")}
                            </Button>
                          </>
                        ) : null}
                        {payout.status === "REQUESTED" || payout.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold text-danger hover:bg-danger-soft"
                            onClick={() => onReject(payout)}
                          >
                            {t("payout.reject")}
                          </Button>
                        ) : null}
                        {payout.status === "COMPLETED" || payout.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs font-bold"
                            onClick={() => onViewVoucher(payout)}
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            <span>{t("invoice.viewReceipt")}</span>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
