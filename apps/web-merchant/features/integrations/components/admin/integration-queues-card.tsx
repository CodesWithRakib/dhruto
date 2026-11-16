"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@dhruto/ui";

interface QueueItem {
  name: string;
  reachable: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface IntegrationQueuesCardProps {
  queues: QueueItem[];
}

export function IntegrationQueuesCard({ queues }: IntegrationQueuesCardProps) {
  const t = useTranslations("AdminIntegrations");

  return (
    <div className="rounded-3xl bg-surface-elevated p-6">
      <h3 className="mb-4 text-base font-bold text-foreground">{t("queuesTitle")}</h3>
      {queues.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("queuesEmpty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {queues.map((q) => (
            <div key={q.name} className="rounded-2xl bg-surface-muted/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">{q.name}</span>
                <Badge variant={q.reachable ? "default" : "secondary"}>
                  {q.reachable ? t("reachable") : t("unreachable")}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-5 gap-1 text-center text-[11px]">
                {(
                  [
                    ["waiting", q.waiting],
                    ["active", q.active],
                    ["completed", q.completed],
                    ["failed", q.failed],
                    ["delayed", q.delayed],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground">{t(`queue_${k}`)}</dt>
                    <dd className="text-sm font-bold tabular-nums text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
