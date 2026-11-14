"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarRange } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { PARCEL_STATUS_CONFIG } from "@/config/status";
import { getAllDistricts, getThanasForDistrict } from "@/lib/data/bangladesh-locations";
import { buildDateRange, type DateRangePreset } from "../lib/date-range";
import type { ParcelListFilters } from "../hooks/use-parcels-list";

export interface ParcelFilterControlsProps {
  filters: ParcelListFilters;
  updateFilter: <K extends keyof ParcelListFilters>(key: K, value: ParcelListFilters[K]) => void;
  /** Applies `from` + `to` together (see the hook for why they can't race). */
  setDateRange: (range: { from: string; to: string }) => void;
  clearDateRange: () => void;
  resetFilters: () => void;
  activeFilterCount: number;
  /** Distinguishes duplicate ids when rendered in a sheet and a toolbar. */
  idPrefix: string;
  /** Vertical layout for the mobile sheet. */
  stacked?: boolean;
}

/** Presets are label keys resolved from the `ParcelList` message namespace. */
const RANGE_PRESETS: ReadonlyArray<{ preset: DateRangePreset; labelKey: string }> = [
  { preset: "today", labelKey: "rangeToday" },
  { preset: "last7", labelKey: "rangeLast7" },
  { preset: "last30", labelKey: "rangeLast30" },
];

/**
 * All shipment filters. Every control maps to a real query parameter of the
 * list endpoint (`status`, `district`, `thana`, `from`, `to`) — the API filters
 * and paginates, the browser never re-filters a page locally.
 *
 * The same component renders inline on desktop and inside the mobile filter
 * sheet, so `idPrefix` keeps element ids unique when both are mounted.
 */
export function ParcelFilterControls({
  filters,
  updateFilter,
  setDateRange,
  clearDateRange,
  resetFilters,
  activeFilterCount,
  idPrefix,
  stacked = false,
}: ParcelFilterControlsProps) {
  const t = useTranslations("ParcelList");
  const tStatus = useTranslations("ParcelStatus");

  const id = (name: string) => `${idPrefix}-${name}`;
  const hasDateRange = Boolean(filters.from || filters.to);

  const allDistricts = useMemo(() => getAllDistricts(), []);
  const availableThanas = useMemo(() => {
    return filters.district ? getThanasForDistrict(filters.district) : [];
  }, [filters.district]);

  const handleDistrictChange = (value: string) => {
    const newDistrict = value === "all" ? "" : value;
    updateFilter("district", newDistrict);
    if (filters.thana) {
      const validThanas = getThanasForDistrict(newDistrict);
      const stillValid = validThanas.some(
        (t) => t.name.toLowerCase() === filters.thana.toLowerCase() || t.nameBn === filters.thana,
      );
      if (!stillValid) {
        updateFilter("thana", "");
      }
    }
  };

  const handleThanaChange = (value: string) => {
    updateFilter("thana", value === "all" ? "" : value);
  };

  return (
    <div className="space-y-4">
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
            <SelectTrigger id={id("status")} className="w-full">
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
          <Select
            value={filters.district || "all"}
            onValueChange={handleDistrictChange}
          >
            <SelectTrigger id={id("district")} className="w-full">
              <SelectValue placeholder={t("allDistricts")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("allDistricts")}</SelectItem>
              {allDistricts.map((d) => (
                <SelectItem key={d.name} value={d.name}>
                  {d.name} ({d.nameBn})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={id("thana")} className="text-caption text-muted-foreground">
            {t("filterThana")}
          </Label>
          <Select
            value={filters.thana || "all"}
            disabled={!filters.district}
            onValueChange={handleThanaChange}
          >
            <SelectTrigger id={id("thana")} className="w-full">
              <SelectValue
                placeholder={
                  filters.district ? t("allThanas") : t("selectDistrictFirst")
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("allThanas")}</SelectItem>
              {availableThanas.map((th) => (
                <SelectItem key={th.name} value={th.name}>
                  {th.name} ({th.nameBn})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                event.target.value
                  ? new Date(`${event.target.value}T00:00:00`).toISOString()
                  : "",
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
                event.target.value
                  ? new Date(`${event.target.value}T23:59:59`).toISOString()
                  : "",
              )
            }
          />
        </div>
      </div>

      {/* Quick ranges: one tap instead of two date pickers. */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("quickRange")}>
        <span className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          {t("quickRange")}
        </span>
        {RANGE_PRESETS.map((option) => (
          <Button
            key={option.preset}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDateRange(buildDateRange(option.preset))}
          >
            {t(option.labelKey)}
          </Button>
        ))}
        {hasDateRange ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearDateRange}>
            {t("clearRange")}
          </Button>
        ) : null}
      </div>

      <div className={stacked ? "pt-1" : "flex justify-end"}>
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
