"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { User, Building, Calendar, Power } from "lucide-react";
import type { RiderProfile } from "@dhruto/contracts";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { RIDER_STATUS_TONE } from "@/config/status";
import { useFormatters } from "@/lib/format";

interface RiderProfileHeaderCardProps {
  profile: RiderProfile;
  onDuty: boolean;
  isToggling: boolean;
  onDutyToggle: () => void;
}

export function RiderProfileHeaderCard({
  profile,
  onDuty,
  isToggling,
  onDutyToggle,
}: RiderProfileHeaderCardProps) {
  const t = useTranslations("Rider");
  const { date: fmtDate } = useFormatters();

  return (
    <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-success font-extrabold text-xl text-white">
              {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
            </span>
            <span
              className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ${
                onDuty ? "bg-success" : "bg-muted-foreground"
              }`}
              title={onDuty ? "On duty" : "Off duty"}
            >
              <span className={`h-2 w-2 rounded-full ${onDuty ? "bg-white animate-pulse" : "bg-white/60"}`} />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-extrabold text-foreground">{profile.name}</h2>
              <EnumBadge
                namespace="RiderStatus"
                value={profile.status}
                tones={RIDER_STATUS_TONE}
              />
            </div>
            <p className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground">
              ID: <span className="text-foreground">{profile.riderCode}</span>
            </p>
          </div>
        </div>

        {/* Duty toggle button */}
        <div className="flex items-center gap-2.5">
          <Button
            variant={onDuty ? "ghost" : "default"}
            onClick={onDutyToggle}
            disabled={isToggling}
            className={`h-11 gap-2 rounded-2xl px-5 text-xs font-bold transition-all ${
              onDuty
                ? "bg-success/15 text-success-soft-foreground hover:bg-success/25"
                : ""
            }`}
          >
            <Power className="h-4 w-4" />
            {onDuty ? t("goOffDuty") : t("goOnDuty")}
          </Button>
        </div>
      </div>

      {/* Hub & Account Meta */}
      <div className="grid grid-cols-2 gap-3.5 rounded-2xl bg-surface-muted/40 p-4 sm:grid-cols-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Building className="h-3.5 w-3.5" />
            <span>{t("profile.hub")}</span>
          </div>
          <p className="mt-1 truncate text-xs font-bold text-foreground">
            {profile.hubName}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">Code: {profile.hubCode}</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{t("profile.memberSince")}</span>
          </div>
          <p className="mt-1 text-xs font-bold text-foreground">
            {fmtDate(profile.joinedAt)}
          </p>
          <p className="text-[11px] text-muted-foreground">Active courier account</p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Active Duty Mode
          </p>
          <p className={`mt-1 text-xs font-bold ${onDuty ? "text-success-soft-foreground" : "text-muted-foreground"}`}>
            {onDuty ? "On duty (Dispatched)" : "Off duty (Standby)"}
          </p>
          <p className="text-[11px] text-muted-foreground">Live dispatch availability</p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("profile.riderCode")}
          </p>
          <p className="mt-1 font-mono text-xs font-extrabold text-foreground">
            {profile.riderCode}
          </p>
          <p className="text-[11px] text-muted-foreground">Rider identification</p>
        </div>
      </div>
    </div>
  );
}
