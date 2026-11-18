"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { History, Clock } from "lucide-react";
import type { RiderTaskDetails } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

interface TaskAttemptsCardProps {
  attempts: RiderTaskDetails["attempts"];
}

export function TaskAttemptsCard({ attempts }: TaskAttemptsCardProps) {
  const t = useTranslations("Rider");
  const { dateTime } = useFormatters();

  return (
    <div className="overflow-hidden rounded-3xl bg-surface-elevated">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <History className="h-4 w-4" aria-hidden="true" />
          <span>{t("details.attemptsTitle")}</span>
        </h2>
        <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-mono font-bold text-muted-foreground">
          {attempts.length}
        </span>
      </div>

      {attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted/60 text-muted-foreground">
            <Clock className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-foreground">First Delivery Attempt</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            No prior attempts have been recorded for this package. All delivery actions and outcomes will appear here.
          </p>
        </div>
      ) : (
        <ul>
          {attempts.map((attempt) => (
            <li key={attempt.id} className="space-y-1.5 p-4 text-xs transition-colors hover:bg-surface-muted/30">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    attempt.outcome === "DELIVERED"
                      ? "bg-success/15 text-success-soft-foreground"
                      : "bg-danger/15 text-danger-soft-foreground"
                  }`}
                >
                  #{attempt.attemptNumber} {attempt.outcome === "DELIVERED" ? "Delivered" : "Attempt Failed"}
                </span>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                  {dateTime(attempt.createdAt)}
                </span>
              </div>
              {attempt.failureReason ? (
                <p className="font-semibold text-foreground">
                  {t(
                    `failReasons.${attempt.failureReason}` as "failReasons.CUSTOMER_UNAVAILABLE",
                  )}
                </p>
              ) : null}
              {attempt.notes ? <p className="text-muted-foreground">{attempt.notes}</p> : null}
              {attempt.rescheduledFor ? (
                <p className="inline-flex items-center gap-1 font-mono text-[11px] text-warning-soft-foreground">
                  <span>Rescheduled:</span>
                  <span>{dateTime(attempt.rescheduledFor)}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
