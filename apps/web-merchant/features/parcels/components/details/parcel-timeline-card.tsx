"use client";

import React from "react";
import { AlertCircle, Clock } from "lucide-react";
import { ParcelStatus, type ParcelHistoryEntry } from "@dhruto/contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dhruto/ui";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Timeline, TimelineItem } from "@/components/data-display/timeline";
import { PARCEL_STATUS_CONFIG, statusConfig } from "@/config/status";

interface ParcelTimelineCardProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  tStatus: (key: string) => string;
  dateTime: (val: string | Date) => string;
  historyEntries: ParcelHistoryEntry[];
}

export function ParcelTimelineCard({
  t,
  tStatus,
  dateTime,
  historyEntries,
}: ParcelTimelineCardProps) {
  return (
    <Card className="rounded-3xl bg-surface-elevated/90 backdrop-blur-md">
      <CardHeader className="pb-3 pt-6 px-6">
        <CardTitle className="flex items-center gap-2.5 text-body font-bold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-h4 font-bold tracking-tight">{t("statusHistory")}</span>
        </CardTitle>
        <CardDescription className="text-caption text-muted-foreground mt-1">
          {t("statusHistoryHint")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 px-6 pb-6">
        {historyEntries.length === 0 ? (
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {t("noHistory")}
          </p>
        ) : (
          <Timeline label={t("statusHistory")}>
            {[...historyEntries]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((entry, index) => (
                <TimelineItem
                  key={entry.id}
                  title={<StatusBadge status={entry.toStatus} />}
                  timestamp={dateTime(entry.createdAt)}
                  dateTime={entry.createdAt}
                  tone={statusConfig(entry.toStatus as ParcelStatus).tone}
                  current={index === 0}
                >
                  {entry.fromStatus ? (
                    <span className="mt-1 block text-caption text-muted-foreground">
                      {t("fromStatus", {
                        status: tStatus(PARCEL_STATUS_CONFIG[entry.fromStatus].labelKey),
                      })}
                    </span>
                  ) : null}
                  {entry.description ? (
                    <p className="mt-1 text-body-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-caption text-muted-foreground">
                    {t("recordedBy", { role: entry.actorRole })}
                  </p>
                </TimelineItem>
              ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
}
