"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent } from "@dhruto/ui";
import { Download } from "lucide-react";
import type { FinancialTransactionItem } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

interface AdminReportsTabProps {
  fees: Record<string, unknown>[];
  journal: FinancialTransactionItem[];
  downloadCsv: (filename: string, columns: string[], rows: Record<string, unknown>[]) => void;
}

export function AdminReportsTab({ fees, journal, downloadCsv }: AdminReportsTabProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();

  return (
    <Card className="rounded-3xl bg-surface-elevated p-6 sm:p-8">
      <CardContent className="space-y-6 p-0 max-w-2xl">
        <div>
          <h3 className="text-base font-extrabold text-foreground">{t("admin.reportsTab")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.reports.description")}
          </p>
        </div>

        <div className="rounded-2xl bg-surface-muted/60 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("admin.reports.cumulativeFees")}
          </span>
          <p className="mt-1 font-mono text-2xl font-black text-foreground">
            {bdt(
              fees.reduce(
                (s, f) => s + Number((f as Record<string, unknown>).totalMinor ?? 0),
                0,
              ) / 100,
            )}
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2 font-bold"
          onClick={() =>
            downloadCsv(
              "journal.csv",
              [
                "transactionCode",
                "type",
                "status",
                "referenceType",
                "referenceId",
                "createdAt",
              ],
              journal.map((txn) => ({ ...txn })),
            )
          }
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>{t("admin.exportCsv")} ({t("admin.reports.journalExport")})</span>
        </Button>
      </CardContent>
    </Card>
  );
}
