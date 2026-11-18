"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import type { OperationalExceptionItem } from "@dhruto/contracts";

interface HubExceptionsAlertProps {
  openExceptions: OperationalExceptionItem[];
}

export function HubExceptionsAlert({ openExceptions }: HubExceptionsAlertProps) {
  const t = useTranslations("Hub");

  if (openExceptions.length === 0) return null;

  return (
    <div className="relative rounded-3xl bg-warning/10 backdrop-blur-md p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/15 text-warning-soft-foreground">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-foreground">
              {t("dashboard.exceptionsNeedAttention")} ({openExceptions.length})
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {openExceptions.slice(0, 4).map((e, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-bold text-warning-soft-foreground"
                >
                  {e.type.replace(/_/g, " ")}
                </span>
              ))}
              {openExceptions.length > 4 ? (
                <span className="text-[11px] font-medium text-muted-foreground">
                  +{openExceptions.length - 4} more
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <Link href="/hub/exceptions" className="shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-10 gap-1.5 rounded-xl bg-surface-elevated text-xs font-bold text-warning-soft-foreground hover:bg-warning/15"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            <span>{t("dashboard.reviewExceptions")}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
