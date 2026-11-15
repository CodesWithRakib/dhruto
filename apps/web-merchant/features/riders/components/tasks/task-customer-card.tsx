"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { Phone, Navigation, Play, FileText } from "lucide-react";
import type { RiderTaskDetails } from "@dhruto/contracts";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";

export const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ASSIGNED_TO_RIDER: {
    label: "Assigned",
    dot: "bg-blue-500 ring-blue-500/30",
    badge: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    dot: "bg-amber-500 ring-amber-500/30 animate-pulse",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  DELIVERED: {
    label: "Delivered",
    dot: "bg-emerald-500 ring-emerald-500/30",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  CASH_PENDING: {
    label: "Cash Pending Hand-In",
    dot: "bg-amber-500 ring-amber-500/30",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  CASH_VERIFIED: {
    label: "Cash Verified",
    dot: "bg-emerald-500 ring-emerald-500/30",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  FAILED_ATTEMPT: {
    label: "Failed Attempt",
    dot: "bg-rose-500 ring-rose-500/30",
    badge: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  RETURNED_TO_HUB: {
    label: "Returned to Hub",
    dot: "bg-slate-500 ring-slate-500/30",
    badge: "border-border bg-surface-muted text-muted-foreground",
  },
};

interface TaskCustomerCardProps {
  task: RiderTaskDetails;
  started: boolean;
  done: boolean;
  isStarting: boolean;
  onStart: () => void;
}

export function TaskCustomerCard({
  task,
  started,
  done,
  isStarting,
  onStart,
}: TaskCustomerCardProps) {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${task.deliveryAddress}, ${task.thana || ""}, ${task.district || ""}, Bangladesh`,
  )}`;

  return (
    <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-extrabold text-foreground">{task.trackingCode}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(task.trackingCode);
              toast.success(task.trackingCode);
            }}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
            aria-label="Copy tracking code"
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            (STATUS_CONFIG[task.status] || { badge: "bg-primary-soft text-primary" }).badge
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ring-2 ${
              (STATUS_CONFIG[task.status] || { dot: "bg-primary ring-primary/30" }).dot
            }`}
          />
          <span>{(STATUS_CONFIG[task.status] || { label: task.status.replace(/_/g, " ") }).label}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-surface-muted/40 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("details.recipient")}
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">{task.recipientName}</p>
        </div>

        <div className="rounded-2xl bg-surface-muted/40 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("details.phone")}
          </p>
          <a
            href={`tel:${task.recipientPhone}`}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{task.recipientPhone}</span>
          </a>
        </div>

        <div className="rounded-2xl bg-amber-500/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            {t("details.codDue")}
          </p>
          <p className="mt-1 font-mono text-base font-extrabold text-foreground">
            {task.codAmount > 0 ? (
              <span className="text-amber-900 dark:text-amber-100">{bdt(task.codAmount)}</span>
            ) : (
              <span className="text-muted-foreground">Prepaid</span>
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-surface-muted/40 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("details.weight")}
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-foreground">{task.weight} kg</p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-muted/40 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("details.address")}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {task.deliveryAddress}
          {[task.thana, task.district].filter(Boolean).length > 0
            ? `, ${[task.thana, task.district].filter(Boolean).join(", ")}`
            : ""}
        </p>
      </div>

      {/* Quick Communication Actions */}
      <div className="flex flex-wrap gap-2.5 sm:flex-nowrap">
        <a
          href={`tel:${task.recipientPhone}`}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 px-4 text-xs font-bold text-emerald-800 dark:text-emerald-200 transition-all hover:bg-emerald-500/25"
        >
          <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>{t("tasks.callCustomer")}</span>
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500/15 px-4 text-xs font-bold text-blue-800 dark:text-blue-200 transition-all hover:bg-blue-500/25"
        >
          <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>{t("tasks.openMap")}</span>
        </a>
      </div>

      {!started && !done ? (
        <Button
          onClick={onStart}
          disabled={isStarting}
          className="h-12 w-full gap-2 rounded-2xl text-sm font-bold"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {isStarting ? t("details.starting") : t("details.startDelivery")}
        </Button>
      ) : null}
    </div>
  );
}
