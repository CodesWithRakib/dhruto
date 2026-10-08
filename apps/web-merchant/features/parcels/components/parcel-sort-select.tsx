"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown } from "lucide-react";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import { PARCEL_SORT_OPTIONS, type ParcelSortValue } from "../hooks/use-parcels-list";

export interface ParcelSortSelectProps {
  value: ParcelSortValue;
  onChange: (value: ParcelSortValue) => void;
  /** Distinguishes duplicate ids when rendered in a sheet and a toolbar. */
  idPrefix: string;
  /** Hides the visible label (the sheet supplies its own group heading). */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Sort order for the shipment list. Every option is a real `sort` + `order`
 * pair the list endpoint supports — changing it re-queries the API, returning
 * to the same page, so the whole filtered set can be re-ordered, not just the
 * visible page.
 */
export function ParcelSortSelect({
  value,
  onChange,
  idPrefix,
  hideLabel = false,
  className,
}: ParcelSortSelectProps) {
  const t = useTranslations("ParcelList");
  const id = `${idPrefix}-sort`;

  return (
    <div className={className}>
      {hideLabel ? null : (
        <Label htmlFor={id} className="sr-only">
          {t("sortLabel")}
        </Label>
      )}
      <Select value={value} onValueChange={(next) => onChange(next as ParcelSortValue)}>
        <SelectTrigger id={id} className="h-11 w-full gap-2 sm:w-48" aria-label={t("sortLabel")}>
          <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PARCEL_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(`sort.${option.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
