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
    <div className="flex items-center gap-2">
      <span className="sr-only">{t("selectHub")}</span>
      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Select
        value={activeHubId ?? hubs[0]?.id ?? ""}
        onValueChange={onChange}
      >
        <SelectTrigger aria-label={t("selectHub")} className="w-full sm:w-72">
          <SelectValue placeholder={t("selectHub")} />
        </SelectTrigger>
        <SelectContent>
          {hubs.map((hub) => (
            <SelectItem key={hub.id} value={hub.id}>
              {hub.name} ({hub.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
