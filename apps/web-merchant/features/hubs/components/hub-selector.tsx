"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dhruto/ui";
import type { HubSummary } from "@dhruto/contracts";

interface HubSelectorProps {
  hubs: HubSummary[];
  activeHubId: string | null;
  onChange: (hubId: string) => void;
}

/**
 * Controlled hub selector for operators with several assignments.
 * Changing the hub only switches the operational context shown in the UI —
 * authorization is always re-checked by the backend.
 */
export function HubSelector({ hubs, activeHubId, onChange }: HubSelectorProps) {
  const t = useTranslations("Hub");

  if (hubs.length === 0) return null;

  return (
    <div className="flex items-center">
      <span className="sr-only">{t("selectHub")}</span>
      <Select
        value={activeHubId ?? hubs[0]?.id ?? ""}
        onValueChange={onChange}
      >
        <SelectTrigger
          aria-label={t("selectHub")}
          className="h-10 w-full sm:w-72 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 focus:ring-2 focus:ring-white/40 focus:ring-offset-0 [&>span]:text-white [&>svg]:text-white/80"
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <SelectValue placeholder={t("selectHub")} />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl bg-popover/95 p-1 backdrop-blur-md">
          {hubs.map((hub) => (
            <SelectItem key={hub.id} value={hub.id} className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium">
              <span className="font-bold text-foreground">{hub.name}</span>
              <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">({hub.code})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
