"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button, Card, DataTable, ColumnDef } from "@dhruto/ui";

export function SectionState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("AnalyticsSections");

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground rounded-3xl bg-surface-elevated">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        {t("loading")}
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="space-y-2 p-6 text-center rounded-3xl bg-surface-elevated">
        <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </Card>
    );
  }
  if (empty) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground rounded-3xl bg-surface-elevated">
        {t("emptyState")}
      </Card>
    );
  }
  return <>{children}</>;
}

export function SimpleTable({
  head,
  rows,
}: {
  head: string[];
  rows: Array<Array<string | number | null>>;
}) {
  const columns: ColumnDef<Array<string | number | null>>[] = React.useMemo(() => {
    return head.map((h, j) => ({
      accessorKey: String(j),
      id: String(j),
      header: h,
      cell: ({ row }) => {
        const c = row.original[j];
        return (
          <span className={j > 0 ? "font-mono" : ""}>
            {c === null ? "—" : typeof c === "number" ? c.toLocaleString() : String(c)}
          </span>
        );
      },
    }));
  }, [head]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      className="p-0"
    />
  );
}

export function flatKpi(value: number | null): {
  value: number | null;
  previous: null;
  changePct: null;
  trend: "flat";
  noData: boolean;
} {
  return { value, previous: null, changePct: null, trend: "flat", noData: value === null };
}
