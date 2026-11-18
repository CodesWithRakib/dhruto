"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, Search, CheckCircle2, Clock, MapPin } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";
import { useFormatters } from "@/lib/format";

interface CustomerWelcomeHeroProps {
  incomingCount: number;
  arrivingTodayCount: number;
  deliveredCount: number;
  totalCodDue: number;
  primaryLocation: string;
  isRefreshing: boolean;
  onRefreshAll: () => void;
}

export function CustomerWelcomeHero({
  incomingCount,
  arrivingTodayCount,
  deliveredCount,
  totalCodDue,
  primaryLocation,
  isRefreshing,
  onRefreshAll,
}: CustomerWelcomeHeroProps) {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);
  const { bdt } = useFormatters();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-surface to-surface-muted/30 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("verifiedRecipientBadge")}
            </span>
            {authUser?.phone ? (
              <span className="text-xs text-muted-foreground font-mono">
                {authUser.phone}
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {t("greeting", { name: authUser?.name || t("defaultRecipientName") || "Customer" })}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t("portalSubtitle")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="h-10 text-xs font-semibold gap-1.5 rounded-xl bg-background/80 hover:bg-background"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            {isRefreshing ? "Syncing..." : "Sync Live Status"}
          </Button>
          <Link href={CUSTOMER_ROUTES.tracking}>
            <Button variant="secondary" className="h-10 text-xs font-semibold gap-1.5 rounded-xl">
              <Search className="h-3.5 w-3.5" />
              {t("trackAnyParcel")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Real-Time Stats Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl bg-card p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t("statIncoming")}</span>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{incomingCount}</div>
          <span className="text-[11px] text-primary font-medium">
            {arrivingTodayCount > 0 ? `${arrivingTodayCount} arriving today` : "Scheduled in transit"}
          </span>
        </div>

        <div className="rounded-2xl bg-card p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t("statDelivered")}</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">{deliveredCount}</div>
          <span className="text-[11px] text-muted-foreground">Doorstep handoffs logged</span>
        </div>

        <div className="rounded-2xl bg-card p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t("statCodDue")}</span>
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground font-mono">
            {bdt(totalCodDue)}
          </div>
          <span className="text-[11px] text-muted-foreground">Cash ready for delivery rider</span>
        </div>

        <div className="rounded-2xl bg-card p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{t("statAddress")}</span>
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground truncate">{primaryLocation}</div>
          <span className="text-[11px] text-muted-foreground">Primary Destination</span>
        </div>
      </div>
    </div>
  );
}
