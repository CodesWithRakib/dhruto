"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@dhruto/ui";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReconciliationCheckResult } from "@dhruto/contracts";

interface AdminCheckTabProps {
  check: ReconciliationCheckResult | undefined;
}

export function AdminCheckTab({ check }: AdminCheckTabProps) {
  const t = useTranslations("Finance");

  return (
    <Card className="rounded-3xl bg-surface-elevated p-6 sm:p-8">
      <CardContent className="space-y-6 p-0">
        <div
          role="status"
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-bold ${
            check?.ok
              ? "bg-success-soft text-success-soft-foreground"
              : "bg-danger-soft text-danger-soft-foreground"
          }`}
        >
          {check?.ok ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm">
            {check ? (check.ok ? t("admin.checkOk") : t("admin.checkFailed")) : t("loading")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-surface-muted/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("admin.checkMerchants")}
            </p>
            <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
              {check?.merchants.length ?? 0}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-muted/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("admin.checkRiders")}
            </p>
            <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
              {check?.riders.length ?? 0}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-muted/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("admin.checkSettlements")}
            </p>
            <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
              {check?.settlements.length ?? 0}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-muted/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("admin.checkTransactions")}
            </p>
            <p className="mt-1 font-mono text-2xl font-black text-foreground tabular-nums">
              {check?.transactions.length ?? 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
