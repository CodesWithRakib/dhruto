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
import { CheckCircle2, Undo2 } from "lucide-react";
import type { FinancialTransactionItem } from "@dhruto/contracts";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { EmptyState } from "@/components/feedback/states";
import { FINANCIAL_TXN_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

interface AdminJournalTabProps {
  journal: FinancialTransactionItem[];
  onReverse: (txnId: string) => void;
}

export function AdminJournalTab({ journal, onReverse }: AdminJournalTabProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  return (
    <Card className="rounded-3xl bg-surface-elevated overflow-hidden">
      <CardContent className="p-0">
        {journal.length === 0 ? (
          <div className="p-10">
            <EmptyState icon={CheckCircle2} title={t("statement.empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-inverse text-inverse-foreground">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                    {t("admin.headers.transactionCode")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                    {t("admin.headers.type")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground text-right">
                    {t("admin.headers.debitTotal")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-inverse-foreground">
                    {t("admin.headers.ledgerEntries")}
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
                {journal.map((txn) => {
                  const debit = txn.entries
                    .filter((e) => e.direction === "DEBIT")
                    .reduce((s, e) => s + e.amountMinor, 0);
                  return (
                    <TableRow key={txn.id} className="hover:bg-surface-muted/50 transition-colors">
                      <TableCell className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                        {txn.transactionCode}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-xs font-semibold text-foreground whitespace-nowrap">
                        {txn.type}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-mono text-sm font-bold tabular-nums text-foreground text-right whitespace-nowrap">
                        {bdt(debit / 100)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-xs text-muted-foreground">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {txn.entries.map((entry, index) => (
                            <p key={index} className="truncate">
                              <span
                                className={
                                  entry.direction === "DEBIT"
                                    ? "text-primary font-bold"
                                    : "text-foreground font-medium"
                                }
                              >
                                {entry.direction}
                              </span>{" "}
                              <span className="text-muted-foreground">{entry.account}</span>{" "}
                              <span className="font-bold text-foreground">
                                {bdt(entry.amountMinor / 100)}
                              </span>
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                        <EnumBadge
                          namespace="FinancialTransactionStatus"
                          value={txn.status}
                          tones={FINANCIAL_TXN_STATUS_TONE}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                        {txn.status === "POSTED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs font-bold"
                            onClick={() => onReverse(txn.id)}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            <span>{t("admin.reverseTitle")}</span>
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
