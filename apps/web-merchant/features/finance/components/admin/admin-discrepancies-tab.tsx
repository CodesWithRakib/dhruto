"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dhruto/ui";
import { AlertTriangle } from "lucide-react";
import type { CashDiscrepancyItem } from "@dhruto/contracts";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { EmptyState } from "@/components/feedback/states";
import { CASH_DISCREPANCY_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

interface AdminDiscrepanciesTabProps {
  discrepancies: CashDiscrepancyItem[];
}

export function AdminDiscrepanciesTab({ discrepancies }: AdminDiscrepanciesTabProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  return (
    <Card className="rounded-3xl bg-surface-elevated overflow-hidden">
      <CardContent className="p-0">
        {discrepancies.length === 0 ? (
          <div className="p-10">
            <EmptyState icon={AlertTriangle} title={t("cash.emptyDiscrepancies")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-900 text-slate-100 dark:bg-slate-950 dark:text-slate-100 border-0">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100">
                    {t("admin.headers.discrepancyType")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-center">
                    {t("admin.headers.status")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                    {t("admin.headers.expectedCash")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                    {t("admin.headers.verifiedCash")}
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-100 text-right">
                    {t("admin.headers.netVariance")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {discrepancies.map((d) => (
                  <TableRow key={d.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="px-4 py-3.5 font-bold text-xs text-foreground whitespace-nowrap">
                      {d.type}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-center whitespace-nowrap">
                      <EnumBadge
                        namespace="CashDiscrepancyStatus"
                        value={d.status}
                        tones={CASH_DISCREPANCY_STATUS_TONE}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-xs tabular-nums text-muted-foreground text-right whitespace-nowrap">
                      {bdt(d.expectedMinor / 100)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-xs tabular-nums text-foreground text-right whitespace-nowrap">
                      {bdt(d.actualMinor / 100)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-sm font-bold tabular-nums text-danger text-right whitespace-nowrap">
                      {d.differenceMinor > 0 ? "+" : ""}
                      {bdt(d.differenceMinor / 100)}
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
