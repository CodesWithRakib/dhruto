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
    dot: "bg-info",
    badge: "bg-info/10 text-info-soft-foreground",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    dot: "bg-warning animate-pulse",
    badge: "bg-warning/10 text-warning-soft-foreground",
  },
  DELIVERED: {
    label: "Delivered",
    dot: "bg-success",
    badge: "bg-success/10 text-success-soft-foreground",
  },
  CASH_PENDING: {
    label: "Cash Pending Hand-In",
    dot: "bg-warning",
    badge: "bg-warning/10 text-warning-soft-foreground",
  },
  CASH_VERIFIED: {
    label: "Cash Verified",
    dot: "bg-success",
    badge: "bg-success/10 text-success-soft-foreground",
  },
  FAILED_ATTEMPT: {
    label: "Failed Attempt",
    dot: "bg-danger",
    badge: "bg-danger/10 text-danger-soft-foreground",
  },
  RETURNED_TO_HUB: {
    label: "Returned to Hub",
    dot: "bg-muted-foreground",
    badge: "bg-surface-muted text-muted-foreground",
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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
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
            className={`h-2 w-2 rounded-full ${
              (STATUS_CONFIG[task.status] || { dot: "bg-primary" }).dot
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
            <Phone className="h-3.5 w-3.5 text-success" />
            <span>{task.recipientPhone}</span>
          </a>
        </div>

        <div className="rounded-2xl bg-warning/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-warning-soft-foreground">
            {t("details.codDue")}
          </p>
          <p className="mt-1 font-mono text-base font-extrabold text-foreground">
            {task.codAmount > 0 ? (
              <span className="text-warning-soft-foreground">{bdt(task.codAmount)}</span>
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
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-success/15 px-4 text-xs font-bold text-success-soft-foreground transition-all hover:bg-success/25"
        >
          <Phone className="h-4 w-4 text-success" aria-hidden="true" />
          <span>{t("tasks.callCustomer")}</span>
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-info/15 px-4 text-xs font-bold text-info-soft-foreground transition-all hover:bg-info/25"
        >
          <Navigation className="h-4 w-4 text-info" aria-hidden="true" />
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
