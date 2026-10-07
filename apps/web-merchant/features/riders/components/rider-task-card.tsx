"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button, Badge } from "@dhruto/ui";
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
        <Badge variant="outline" className="border-info bg-info-soft text-[11px] text-info">
          {status}
        </Badge>
      );
    case "OUT_FOR_DELIVERY":
      return (
        <Badge
          variant="outline"
          className="border-warning bg-warning-soft text-[11px] text-warning"
        >
          {status}
        </Badge>
      );
    case "DELIVERED":
    case "CASH_PENDING":
    case "CASH_VERIFIED":
      return (
        <Badge
          variant="outline"
          className="border-success bg-success-soft text-[11px] text-success"
        >
          {status}
        </Badge>
      );
    case "DELIVERY_ATTEMPTED":
      return (
        <Badge variant="outline" className="border-danger bg-danger-soft text-[11px] text-danger">
          {status}
        </Badge>
      );
    case "RESCHEDULED":
      return (
        <Badge
          variant="outline"
          className="border-primary bg-primary-soft text-[11px] text-primary"
        >
          {status}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[11px]">
          {status}
        </Badge>
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
    <Card className="border-muted">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
            <Package className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{task.trackingCode}</span>
            <button
              type="button"
              onClick={copyTracking}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={task.trackingCode}
            >
              <Copy className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-foreground">{task.recipientName}</h4>
            {task.codAmount > 0 ? (
              <Badge className="bg-warning font-mono text-xs font-bold text-primary-foreground">
                {bdt(task.codAmount)}
              </Badge>
            ) : null}
          </div>

          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{task.deliveryAddress}</span>
          </p>
          {(task.thana || task.district) && (
            <p className="pl-4 text-[11px] text-muted-foreground">
              {task.thana ? `${task.thana}, ` : ""}
              {task.district || ""}
            </p>
          )}
          {task.attemptCount > 0 ? (
            <p className="flex items-center gap-1 pl-4 text-[11px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {t("tasks.attempts", { count: task.attemptCount })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${task.recipientPhone}`}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              aria-label={`${t("tasks.callCustomer")}: ${task.recipientName}`}
            >
              <Phone className="h-3 w-3 text-success" aria-hidden="true" />
              {t("tasks.callCustomer")}
            </a>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Navigation className="h-3 w-3 text-info" aria-hidden="true" />
              {t("tasks.openMap")}
            </a>

            <Link
              href={`/track/${task.trackingCode}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label={task.trackingCode}
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {startable ? (
              <Button
                size="sm"
                onClick={() => onStartDelivery(task.id)}
                disabled={isStarting}
                className="h-9 gap-1.5 text-xs"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                {isStarting ? t("details.starting") : t("details.startDelivery")}
              </Button>
            ) : null}
            <Link href={RIDER_ROUTES.task(task.id)}>
              <Button size="sm" variant={startable ? "outline" : "default"} className="h-9 text-xs">
                {t("tasks.openDetails")}
              </Button>
            </Link>
            {(task.status === "DELIVERED" || task.status === "CASH_PENDING") && (
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {task.status}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
