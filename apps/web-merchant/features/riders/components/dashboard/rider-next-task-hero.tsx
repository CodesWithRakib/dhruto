"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Copy, Package, Phone, Play } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { EmptyState } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";
import { toast } from "sonner";
import type { RiderTaskItem } from "@dhruto/contracts";

interface RiderNextTaskHeroProps {
  nextTask?: RiderTaskItem;
}

export function RiderNextTaskHero({ nextTask }: RiderNextTaskHeroProps) {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();

  const copyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(code);
  };

  if (!nextTask) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={t("dashboard.noTasks")}
        description={t("dashboard.noTasksDescription")}
        action={
          <Link href={RIDER_ROUTES.tasks}>
            <Button variant="outline" size="sm" className="rounded-xl">
              {t("dashboard.viewTasks")}
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/90 backdrop-blur-md p-5 sm:p-6 shadow-sm transition-all duration-200">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-2xs">
            <Package className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-xl bg-primary/20 border border-primary/30 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                {nextTask.trackingCode}
                <button
                  type="button"
                  onClick={() => copyTracking(nextTask.trackingCode)}
                  className="text-primary/70 hover:text-primary ml-1"
                  aria-label="Copy code"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>
              <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {nextTask.status === "OUT_FOR_DELIVERY" ? "Out for Delivery" : "Assigned"}
              </span>
            </div>
            <p className="mt-1.5 truncate text-base font-bold text-foreground">
              {nextTask.recipientName}
            </p>
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              {nextTask.deliveryAddress}
              {[nextTask.thana, nextTask.district].filter(Boolean).length > 0
                ? `, ${[nextTask.thana, nextTask.district].filter(Boolean).join(", ")}`
                : ""}
            </p>
            {nextTask.codAmount > 0 && (
              <p className="mt-1 font-mono text-xs font-semibold text-foreground">
                COD to collect: <span className="font-bold text-primary">{bdt(nextTask.codAmount)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
          {nextTask.recipientPhone && (
            <a
              href={`tel:${nextTask.recipientPhone}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-surface-elevated px-4 text-xs font-bold text-foreground transition-colors hover:bg-surface-muted"
            >
              <Phone className="h-4 w-4 text-success" aria-hidden="true" />
              <span className="hidden sm:inline">{t("tasks.callCustomer")}</span>
            </a>
          )}
          <Link href={RIDER_ROUTES.task(nextTask.id)} className="w-full sm:w-auto">
            <Button className="h-11 w-full gap-2 rounded-2xl px-5 text-sm font-bold sm:w-auto shadow-xs">
              <Play className="h-4 w-4" aria-hidden="true" />
              {nextTask.status === "OUT_FOR_DELIVERY"
                ? t("details.attemptDelivery")
                : t("dashboard.startNext")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
