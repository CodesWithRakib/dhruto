"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
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
    <label className="flex items-center gap-2">
      <span className="sr-only">{t("selectHub")}</span>
      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <select
        value={activeHubId ?? hubs[0]?.id ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t("selectHub")}
        className="w-full cursor-pointer rounded-xl border-2 border-primary/20 bg-background px-4 py-2.5 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-72"
      >
        {hubs.map((hub) => (
          <option key={hub.id} value={hub.id}>
            {hub.name} ({hub.code})
          </option>
        ))}
      </select>
    </label>
  );
}
