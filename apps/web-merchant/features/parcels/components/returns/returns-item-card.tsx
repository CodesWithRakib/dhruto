"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Copy, RotateCcw } from "lucide-react";
import { Button } from "@dhruto/ui";
import type { ParcelListItem, ParcelStatus } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { StatusBadge } from "@/components/data-display/status-badge";
import { toast } from "sonner";

interface ReturnsItemCardProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  parcel: ParcelListItem;
  detailsHref: string;
  bdt: (val: number) => string;
  date: (val: string | Date) => string;
  time: (val: string | Date) => string;
}

export function ReturnsItemCard({
  t,
  parcel,
  detailsHref,
  bdt,
  date,
  time,
}: ReturnsItemCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(parcel.trackingCode);
    setCopied(true);
    toast.success(t("copied", { code: parcel.trackingCode }));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-surface-muted/40 hover:bg-surface-muted/70 rounded-2xl border border-border/50 hover:border-border transition-all">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <RotateCcw className="h-4 w-4" />
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={detailsHref}
              className="font-mono text-xs font-bold text-foreground hover:underline hover:text-primary transition-colors"
            >
              {parcel.trackingCode}
            </Link>
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              title={t("copyCode")}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <StatusBadge status={parcel.status as ParcelStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{parcel.recipientName}</span>
            <span>·</span>
            <span className="font-mono">{parcel.recipientPhone}</span>
            <span>·</span>
            <span>{parcel.district}</span>
          </div>

          <p className="text-caption text-muted-foreground">
            {t("bookedOn", { date: date(parcel.createdAt), time: time(parcel.createdAt) })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
        <div className="text-right">
          <p className="text-body-sm font-bold tabular-nums text-foreground">
            {bdt(parcel.codAmount)}
          </p>
          <p className="text-caption text-muted-foreground font-medium">
            {t("fee")} {bdt(parcel.deliveryFee)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Link href={detailsHref}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-border/80 hover:bg-surface-elevated text-xs font-semibold gap-1.5"
            >
              <span>{t("details")}</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
