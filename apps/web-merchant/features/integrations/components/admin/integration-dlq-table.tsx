"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button, DataTable } from "@dhruto/ui";
import { IntegrationFailureStatus, type IntegrationFailureItem } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

interface IntegrationDlqTableProps {
  isLoading: boolean;
  failureItems: IntegrationFailureItem[];
  failureTotal: number;
  failurePage: number;
  failurePages: number;
  setFailurePage: React.Dispatch<React.SetStateAction<number>>;
  onReplay: (id: string) => void;
  onResolve: (id: string) => void;
  isReplaying: boolean;
  isResolving: boolean;
}

export function IntegrationDlqTable({
  isLoading,
  failureItems,
  failureTotal,
  failurePage,
  failurePages,
  setFailurePage,
  onReplay,
  onResolve,
  isReplaying,
  isResolving,
}: IntegrationDlqTableProps) {
  const t = useTranslations("AdminIntegrations");
  const { dateTime } = useFormatters();

  return (
    <div className="rounded-3xl bg-surface-elevated p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">
          {t("dlqTitle")} ({failureTotal})
        </h3>
        <span className="text-xs text-muted-foreground">{t("dlqHint")}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          {t("loading")}
        </div>
      ) : failureItems.length === 0 ? (
        <div className="py-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-success opacity-60" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-foreground">{t("dlqEmpty")}</p>
          <p className="text-xs text-muted-foreground">{t("dlqEmptyHint")}</p>
        </div>
      ) : (
        <>
          <DataTable
            data={failureItems}
            columns={[
              {
                accessorKey: "queue",
                header: t("colQueue"),
              },
              {
                accessorKey: "kind",
                header: t("colKind"),
              },
              {
                accessorKey: "reason",
                header: t("colReason"),
                cell: ({ row }: { row: { original: IntegrationFailureItem } }) => (
                  <span className="block max-w-[320px] truncate" title={row.original.reason}>
                    {row.original.reason}
                  </span>
                ),
              },
              {
                accessorKey: "attempts",
                header: t("colAttempts"),
              },
              {
                accessorKey: "status",
                header: t("colStatus"),
              },
              {
                accessorKey: "lastAttemptAt",
                header: t("colLastAttempt"),
                cell: ({ row }: { row: { original: IntegrationFailureItem } }) => (
                  <span>
                    {row.original.lastAttemptAt ? dateTime(row.original.lastAttemptAt) : "—"}
                  </span>
                ),
              },
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {failureItems
              .filter((f) => f.status === IntegrationFailureStatus.OPEN)
              .slice(0, 5)
              .map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]"
                >
                  <span className="max-w-[180px] truncate font-mono">{f.jobId ?? f.id}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px]"
                    disabled={isReplaying}
                    onClick={() => onReplay(f.id)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
                    {t("replay")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    disabled={isResolving}
                    onClick={() => onResolve(f.id)}
                  >
                    {t("resolve")}
                  </Button>
                </div>
              ))}
          </div>
          {failurePages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={failurePage <= 1}
                onClick={() => setFailurePage((p) => Math.max(1, p - 1))}
              >
                {t("previous")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("pageOf", { page: failurePage, totalPages: failurePages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={failurePage >= failurePages}
                onClick={() => setFailurePage((p) => Math.min(failurePages, p + 1))}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
