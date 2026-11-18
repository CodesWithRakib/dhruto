"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@dhruto/ui";
import { ShieldCheck } from "lucide-react";
import { Timeline, TimelineItem } from "@/components/data-display/timeline";
import { useFormatters } from "@/lib/format";
import { ParcelStatus } from "@dhruto/contracts";

export interface TrackingTimelineEvent {
  status: ParcelStatus | string;
  timestamp: string | Date;
  labelEn: string;
  labelBn: string;
  note?: string | null;
}

interface TrackingMilestoneHistoryProps {
  timeline: TrackingTimelineEvent[];
  updatedAt: string | Date;
}

export function TrackingMilestoneHistory({ timeline, updatedAt }: TrackingMilestoneHistoryProps) {
  const t = useTranslations("Tracking");
  const locale = useLocale();
  const { dateTime } = useFormatters();

  return (
    <Card className="rounded-2xl overflow-hidden bg-card">
      <div className="px-6 py-4.5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            {t("timeline")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete immutable scan sequence for this parcel
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold text-primary">
          {timeline.length} Scans Logged
        </span>
      </div>

      <CardContent className="p-6">
        <Timeline label={t("timeline")}>
          {timeline.map((event, index) => {
            const label = locale === "bn" ? event.labelBn : event.labelEn;
            const isLatest = index === timeline.length - 1;

            return (
              <TimelineItem
                key={`${event.timestamp}-${index}`}
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{label}</span>
                    {isLatest ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        LATEST SCAN
                      </span>
                    ) : null}
                  </div>
                }
                timestamp={dateTime(event.timestamp)}
                dateTime={typeof event.timestamp === "string" ? event.timestamp : new Date(event.timestamp).toISOString()}
                tone={
                  isLatest
                    ? "primary"
                    : event.status === ParcelStatus.DELIVERY_ATTEMPTED ||
                        event.status === ParcelStatus.RESCHEDULED
                      ? "warning"
                      : event.status === ParcelStatus.CANCELLED ||
                          event.status === ParcelStatus.LOST ||
                          event.status === ParcelStatus.DAMAGED
                        ? "danger"
                        : "success"
                }
                current={isLatest}
              >
                {event.note ? (
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {event.note}
                  </p>
                ) : null}
              </TimelineItem>
            );
          })}
        </Timeline>
      </CardContent>

      <div className="bg-surface-muted/30 px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {t("lastUpdated", {
            date: dateTime(updatedAt),
          })}
        </span>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Verified by Dhruto Logistics Engine</span>
        </div>
      </div>
    </Card>
  );
}
