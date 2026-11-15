"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, FileText, Plus } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import type { BagListItem, HubSummary } from "@dhruto/contracts";

interface ManifestCreateCardProps {
  destinations: HubSummary[];
  destHubId: string;
  setDestHubId: (id: string) => void;
  vehicleNumber: string;
  setVehicleNumber: (val: string) => void;
  driverName: string;
  setDriverName: (val: string) => void;
  driverPhone: string;
  setDriverPhone: (val: string) => void;
  availableBags: BagListItem[];
  selectedBagIds: string[];
  toggleBagSelection: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isCreating: boolean;
}

export function ManifestCreateCard({
  destinations,
  destHubId,
  setDestHubId,
  vehicleNumber,
  setVehicleNumber,
  driverName,
  setDriverName,
  driverPhone,
  setDriverPhone,
  availableBags,
  selectedBagIds,
  toggleBagSelection,
  onSubmit,
  onCancel,
  isCreating,
}: ManifestCreateCardProps) {
  const t = useTranslations("Hub");

  return (
    <div className="relative rounded-3xl border border-primary/20 bg-card/90 backdrop-blur-md p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Specular top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />

      <div>
        <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("manifests.create")}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("manifests.subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="manifest-destination"
              className="block text-xs font-semibold text-muted-foreground"
            >
              {t("manifests.destination")} <span className="text-danger">*</span>
            </label>
            <Select value={destHubId} onValueChange={setDestHubId} required>
              <SelectTrigger
                id="manifest-destination"
                className="w-full rounded-2xl border border-border/50 bg-surface-muted/60 focus:bg-background"
              >
                <SelectValue placeholder={t("manifests.destination")} />
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
            <label
              htmlFor="manifest-vehicle"
              className="block text-xs font-semibold text-muted-foreground"
            >
              {t("manifests.vehicle")} <span className="text-danger">*</span>
            </label>
            <Input
              id="manifest-vehicle"
              placeholder={t("manifests.vehiclePlaceholder")}
              value={vehicleNumber}
              onChange={(event) => setVehicleNumber(event.target.value)}
              required
              className="rounded-2xl border border-border/50 bg-surface-muted/60 font-mono uppercase focus:bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manifest-driver"
              className="block text-xs font-semibold text-muted-foreground"
            >
              {t("manifests.driverName")}
            </label>
            <Input
              id="manifest-driver"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              className="rounded-2xl border border-border/50 bg-surface-muted/60 focus:bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manifest-driver-phone"
              className="block text-xs font-semibold text-muted-foreground"
            >
              {t("manifests.driverPhone")}
            </label>
            <Input
              id="manifest-driver-phone"
              value={driverPhone}
              onChange={(event) => setDriverPhone(event.target.value)}
              className="rounded-2xl border border-border/50 bg-surface-muted/60 focus:bg-background"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="mb-1 text-sm font-semibold text-foreground">
            {t("manifests.selectBags", { count: selectedBagIds.length })}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("manifests.selectBagsHint")}
          </p>

          {availableBags.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs text-muted-foreground">
              <AlertCircle className="mx-auto mb-1.5 h-5 w-5 text-warning" aria-hidden="true" />
              {t("manifests.noSealedBags")}
            </div>
          ) : (
            <div className="grid max-h-56 grid-cols-1 gap-2.5 overflow-y-auto rounded-2xl border border-border/50 bg-surface-muted/30 p-3 sm:grid-cols-2 md:grid-cols-3">
              {availableBags.map((bag) => {
                const isSelected = selectedBagIds.includes(bag.id);
                return (
                  <div
                    key={bag.id}
                    onClick={() => toggleBagSelection(bag.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleBagSelection(bag.id);
                      }
                    }}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-2xl p-3 text-sm transition-all border ${
                      isSelected
                        ? "border-primary/40 bg-primary/10 text-primary shadow-2xs"
                        : "border-border/40 bg-card hover:bg-surface-muted/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="mt-0.5 rounded text-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-bold text-foreground">
                        {bag.bagCode}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("bags.parcelCount", { count: bag.parcelCount })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isCreating || selectedBagIds.length === 0}
            className="gap-2 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isCreating ? t("manifests.creating") : t("manifests.create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
