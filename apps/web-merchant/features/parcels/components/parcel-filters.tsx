"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { PARCEL_STATUS_CONFIG } from "@/config/status";
import type { ParcelListFilters } from "../hooks/use-parcels-list";

export interface ParcelFilterControlsProps {
  filters: ParcelListFilters;
  updateFilter: <K extends keyof ParcelListFilters>(key: K, value: ParcelListFilters[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  /** Distinguishes duplicate ids when rendered in a sheet and a toolbar. */
  idPrefix: string;
  /** Two-column layout for the mobile sheet. */
  stacked?: boolean;
}



/**
 * All merchant parcel filters. Filters are applied by the API, never in the
 * browser: changing any control re-queries the paginated list endpoint.
 */
export function ParcelFilterControls({
  filters,
  updateFilter,
  resetFilters,
  activeFilterCount,
  idPrefix,
  stacked = false,
}: ParcelFilterControlsProps) {
  const t = useTranslations("ParcelList");
  const tStatus = useTranslations("ParcelStatus");

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className={stacked ? "space-y-4" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-5"}>
      <div className="space-y-1.5">
        <Label htmlFor={id("status")} className="text-caption text-muted-foreground">
          {t("status")}
        </Label>
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            updateFilter("status", (value === "all" ? "" : value) as ParcelListFilters["status"])
          }
        >
          <SelectTrigger id={id("status")}>
            <SelectValue placeholder={t("all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {Object.values(ParcelStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {tStatus(PARCEL_STATUS_CONFIG[status].labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={id("district")} className="text-caption text-muted-foreground">
          {t("filterDistrict")}
        </Label>
        <Input
          id={id("district")}
          value={filters.district}
          onChange={(event) => updateFilter("district", event.target.value)}
          placeholder={t("filterDistrictPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={id("thana")} className="text-caption text-muted-foreground">
          {t("filterThana")}
        </Label>
        <Input
          id={id("thana")}
          value={filters.thana}
          onChange={(event) => updateFilter("thana", event.target.value)}
          placeholder={t("filterThanaPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={id("from")} className="text-caption text-muted-foreground">
          {t("filterFrom")}
        </Label>
        <Input
          id={id("from")}
          type="date"
          value={filters.from ? filters.from.slice(0, 10) : ""}
          onChange={(event) =>
            updateFilter(
              "from",
              event.target.value ? new Date(`${event.target.value}T00:00:00`).toISOString() : "",
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={id("to")} className="text-caption text-muted-foreground">
          {t("filterTo")}
        </Label>
        <Input
          id={id("to")}
          type="date"
          value={filters.to ? filters.to.slice(0, 10) : ""}
          onChange={(event) =>
            updateFilter(
              "to",
              event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : "",
            )
          }
        />
      </div>

      <div className={stacked ? "pt-1" : "flex items-end sm:col-span-2 lg:col-span-5"}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          disabled={activeFilterCount === 0}
          className="text-muted-foreground"
        >
          {t("clearFilters")}
        </Button>
      </div>
    </div>
  );
}
