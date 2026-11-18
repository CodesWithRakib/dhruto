"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Clock, MapPin } from "lucide-react";
import { DistrictSelect, ThanaSelect } from "@/components/location/district-thana-picker";

export interface ZoneOption {
  id: string;
  name: string;
  sla: string;
  baseRate: number;
  perKg: number;
  highlight: string;
}

interface CalculatorDestinationPickerProps {
  zones: ZoneOption[];
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  calcDistrict: string;
  onDistrictChange: (district: string) => void;
  calcThana: string;
  onThanaChange: (thana: string) => void;
  selectedZone: ZoneOption;
}

export function CalculatorDestinationPicker({
  zones,
  selectedZoneId,
  onSelectZone,
  calcDistrict,
  onDistrictChange,
  calcThana,
  onThanaChange,
  selectedZone,
}: CalculatorDestinationPickerProps) {
  const t = useTranslations("Calculator");

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
        <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
          {t("stepDestination")}
        </label>
        {calcDistrict && (
          <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md font-semibold self-start sm:self-auto">
            {t("mappedZone", { zone: selectedZone.name })}
          </span>
        )}
      </div>

      {/* Dynamic District & Thana Cascaded Picker */}
      <div className="mb-3.5 rounded-2xl bg-surface-muted/40 p-3.5 space-y-2 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>{t("choosePrompt")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <DistrictSelect
            value={calcDistrict}
            onChange={(d) => {
              onDistrictChange(d);
              onThanaChange("");
            }}
            placeholder={t("searchDistrict")}
            className="h-9.5 text-xs bg-background/80 rounded-xl"
          />
          <ThanaSelect
            districtName={calcDistrict}
            value={calcThana}
            onChange={onThanaChange}
            placeholder={t("searchThana")}
            className="h-9.5 text-xs bg-background/80 rounded-xl"
          />
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {zones.map((zone) => {
          const isSelected = selectedZoneId === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelectZone(zone.id)}
              className={`relative flex flex-col items-start rounded-2xl p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "bg-primary text-primary-foreground scale-[1.01]"
                  : "bg-surface-muted/60 text-foreground hover:bg-surface-muted"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className={`text-sm font-bold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                  {zone.name}
                </span>
                <span
                  className={`rounded-lg px-2.5 py-0.5 font-mono text-xs font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-surface-muted text-foreground"
                  }`}
                >
                  ৳{zone.baseRate}
                </span>
              </div>
              <div className={`mt-2 flex items-center gap-1.5 text-xs ${isSelected ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                <Clock className="h-3.5 w-3.5" />
                <span>{zone.sla}</span>
              </div>
              <div className={`mt-1 text-[11px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>
                {zone.highlight}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
