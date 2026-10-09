"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button } from "@dhruto/ui";
import {
  Phone,
  MapPin,
  Package,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  ExternalLink,
} from "lucide-react";
import { type RiderTaskItem } from "@dhruto/contracts";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { useFormatters } from "@/lib/format";

interface RiderTaskCardProps {
  task: RiderTaskItem;
  onStartDelivery: (id: string) => void;
  isStarting?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ASSIGNED_TO_RIDER":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info-soft px-2.5 py-0.5 text-[11px] font-bold text-info-soft-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-info" />
          Assigned
        </span>
      );
    case "OUT_FOR_DELIVERY":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-0.5 text-[11px] font-bold text-warning-soft-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </span>
          Out for Delivery
        </span>
      );
    case "DELIVERED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success-soft-foreground">
          <CheckCircle2 className="h-3 w-3 text-success" />
          Delivered
        </span>
      );
    case "CASH_PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Cash Pending
        </span>
      );
    case "CASH_VERIFIED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success-soft-foreground">
          <CheckCircle2 className="h-3 w-3 text-success" />
          Cash Verified
        </span>
      );
    case "DELIVERY_ATTEMPTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft px-2.5 py-0.5 text-[11px] font-bold text-danger-soft-foreground">
          <AlertTriangle className="h-3 w-3 text-danger" />
          Attempted
        </span>
      );
    case "RESCHEDULED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Rescheduled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-border/80 bg-surface-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
          {status}
        </span>
      );
  }
}

export function RiderTaskCard({ task, onStartDelivery, isStarting = false }: RiderTaskCardProps) {
  const t = useTranslations("Rider");
  const { bdt } = useFormatters();

  const copyTracking = () => {
    navigator.clipboard.writeText(task.trackingCode);
    toast.success(task.trackingCode);
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${task.deliveryAddress}, ${task.thana || ""}, ${task.district || ""}, Bangladesh`,
  )}`;

  const startable =
    task.status === "ASSIGNED_TO_RIDER" ||
    task.status === "DELIVERY_ATTEMPTED" ||
    task.status === "RESCHEDULED";

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="space-y-3.5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-soft text-primary shadow-2xs">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-foreground">{task.trackingCode}</span>
            <button
              type="button"
              onClick={copyTracking}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label={task.trackingCode}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-base font-bold text-foreground">{task.recipientName}</h4>
            {task.codAmount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-xl border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-amber-800 shadow-2xs dark:text-amber-200">
                <span className="text-[10px] font-medium uppercase text-amber-700/80 dark:text-amber-400">COD</span>
                {bdt(task.codAmount)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-xl border border-border/60 bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Prepaid
              </span>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{task.deliveryAddress}</span>
          </p>
          {(task.thana || task.district) && (
            <p className="pl-5 text-[11px] text-muted-foreground">
              {[task.thana, task.district].filter(Boolean).join(", ")}
            </p>
          )}
          {task.attemptCount > 0 ? (
            <p className="flex items-center gap-1.5 pl-5 text-[11px] font-semibold text-warning-soft-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
              {t("tasks.attempts", { count: task.attemptCount })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/70 pt-3">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${task.recipientPhone}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-2xs transition-all duration-200 hover:bg-surface-muted hover:border-border"
              aria-label={`${t("tasks.callCustomer")}: ${task.recipientName}`}
            >
              <Phone className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <span>{t("tasks.callCustomer")}</span>
            </a>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-2xs transition-all duration-200 hover:bg-surface-muted hover:border-border"
            >
              <Navigation className="h-3.5 w-3.5 text-info" aria-hidden="true" />
              <span>{t("tasks.openMap")}</span>
            </a>

            <Link
              href={`/track/${task.trackingCode}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-xl p-2 text-xs text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label={task.trackingCode}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {startable ? (
              <Button
                size="sm"
                onClick={() => onStartDelivery(task.id)}
                disabled={isStarting}
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-bold shadow-xs hover:shadow-md"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                {isStarting ? t("details.starting") : t("details.startDelivery")}
              </Button>
            ) : null}
            <Link href={RIDER_ROUTES.task(task.id)}>
              <Button
                size="sm"
                variant={startable ? "outline" : "default"}
                className="h-9 rounded-xl px-3.5 text-xs font-bold shadow-xs hover:shadow-md"
              >
                {t("tasks.openDetails")}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
