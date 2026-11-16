"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Activity, AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import { Badge } from "@dhruto/ui";
import type { IntegrationOverview } from "@dhruto/contracts";

interface IntegrationTelemetryGridProps {
  data: IntegrationOverview;
}

export function IntegrationTelemetryGrid({ data }: IntegrationTelemetryGridProps) {
  const t = useTranslations("AdminIntegrations");

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-3xl bg-surface-elevated p-5 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("deadLetter")}
        </div>
        <p className="text-2xl font-black text-foreground tabular-nums">{data.deadLetterCount}</p>
        <p className="text-[11px] text-muted-foreground">{t("deadLetterHint")}</p>
      </div>

      <div className="rounded-3xl bg-surface-elevated p-5 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          {t("webhookFailureRate")}
        </div>
        <p className="text-2xl font-black text-foreground tabular-nums">
          {(data.webhookFailureRate24h * 100).toFixed(1)}%
        </p>
        <p className="text-[11px] text-muted-foreground">{t("last24h")}</p>
      </div>

      <div className="rounded-3xl bg-surface-elevated p-5 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          <Activity className="h-4 w-4 text-info" aria-hidden="true" />
          {t("outboxPending")}
        </div>
        <p className="text-2xl font-black text-foreground tabular-nums">{data.outbox.pending}</p>
        <p className="text-[11px] text-muted-foreground">
          {t("outboxFailed", { count: data.outbox.failed })}
        </p>
      </div>

      <div className="rounded-3xl bg-surface-elevated p-5 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          {t("providers")}
        </div>
        <div className="mt-2 flex gap-2">
          <Badge variant={data.providers.sms.configured ? "default" : "secondary"}>
            SMS: {data.providers.sms.mode}
          </Badge>
          <Badge variant={data.providers.email.configured ? "default" : "secondary"}>
            Email: {data.providers.email.mode}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("providersHint")}</p>
      </div>
    </div>
  );
}
