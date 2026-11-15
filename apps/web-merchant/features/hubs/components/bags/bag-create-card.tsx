"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import type { HubSummary } from "@dhruto/contracts";

interface BagCreateCardProps {
  destinations: HubSummary[];
  destHubId: string;
  setDestHubId: (id: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isCreating: boolean;
}

export function BagCreateCard({
  destinations,
  destHubId,
  setDestHubId,
  notes,
  setNotes,
  onSubmit,
  onCancel,
  isCreating,
}: BagCreateCardProps) {
  const t = useTranslations("Hub");

  return (
    <div className="relative rounded-3xl border border-primary/20 bg-card/90 backdrop-blur-md p-5 sm:p-6 shadow-sm">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />

      <form onSubmit={onSubmit} className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">{t("bags.create")}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="bag-destination"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("bags.destination")} *
            </label>
            <Select value={destHubId} onValueChange={setDestHubId} required>
              <SelectTrigger
                id="bag-destination"
                className="w-full rounded-2xl border border-border/50 bg-surface-muted/60 focus:bg-background"
              >
                <SelectValue placeholder={t("bags.destination")} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-border/60 bg-surface-elevated shadow-xl">
                {destinations.map((hub) => (
                  <SelectItem key={hub.id} value={hub.id}>
                    {hub.name} ({hub.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="bag-notes" className="text-xs font-semibold text-muted-foreground">
              {t("bags.notes")}
            </label>
            <input
              id="bag-notes"
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("bags.notesPlaceholder")}
              maxLength={500}
              className="w-full rounded-2xl border border-border/50 bg-surface-muted/60 p-3 text-xs outline-none focus:bg-background"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isCreating}
            className="gap-1.5 rounded-xl text-xs font-semibold"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isCreating ? t("bags.creating") : t("bags.confirmCreate")}
          </Button>
        </div>
      </form>
    </div>
  );
}
