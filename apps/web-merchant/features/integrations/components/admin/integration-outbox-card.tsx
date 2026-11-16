"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";
import { Badge, Button } from "@dhruto/ui";

interface OutboxEventItem {
  id: string;
  eventId: string;
  eventType: string;
  attemptCount: number;
  lastError: string | null;
}

interface IntegrationOutboxCardProps {
  isLoading: boolean;
  outboxData?: {
    failed: OutboxEventItem[];
  };
  onReplay: (id: string) => void;
  isReplaying: boolean;
}

export function IntegrationOutboxCard({
  isLoading,
  outboxData,
  onReplay,
  isReplaying,
}: IntegrationOutboxCardProps) {
  const t = useTranslations("AdminIntegrations");

  return (
    <div className="rounded-3xl bg-surface-elevated p-6">
      <h3 className="mb-1 text-base font-bold text-foreground">{t("outboxTitle")}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{t("outboxHint")}</p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          {t("loading")}
        </div>
      ) : !outboxData || outboxData.failed.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{t("outboxEmpty")}</p>
      ) : (
        <div className="space-y-2">
          {outboxData.failed.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-muted/60 p-3 text-xs"
            >
              <Badge variant="secondary">{row.eventType}</Badge>
              <span className="font-mono text-[11px] text-muted-foreground">{row.eventId}</span>
              <span className="text-muted-foreground">
                {t("attempts", { count: row.attemptCount })}
              </span>
              {row.lastError && (
                <span className="max-w-full truncate text-danger">{row.lastError}</span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-7 text-[11px]"
                disabled={isReplaying}
                onClick={() => onReplay(row.id)}
              >
                <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
                {t("replay")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
