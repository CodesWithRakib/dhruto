"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import type { BagListItem } from "@dhruto/contracts";

interface ScannerBagTargetCardProps {
  openBags: BagListItem[];
  selectedBagId: string;
  onSelectBagId: (id: string) => void;
}

export function ScannerBagTargetCard({
  openBags,
  selectedBagId,
  onSelectBagId,
}: ScannerBagTargetCardProps) {
  const t = useTranslations("Hub");

  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-5 shadow-xs">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-foreground">{t("scanner.targetBag")}:</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("scanner.targetBagHint")}</p>
        </div>
        {openBags.length === 0 ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-danger-soft text-danger">
            {t("scanner.noOpenBags")}
          </span>
        ) : (
          <Select value={selectedBagId} onValueChange={onSelectBagId}>
            <SelectTrigger
              aria-label={t("scanner.targetBag")}
              className="w-full sm:w-[320px] font-mono text-xs rounded-xl border border-border/50 bg-surface-muted/60"
            >
              <SelectValue placeholder={t("scanner.targetBag")} />
            </SelectTrigger>
            <SelectContent>
              {openBags.map((bag) => (
                <SelectItem key={bag.id} value={bag.id} className="font-mono text-xs">
                  {bag.bagCode} → {bag.destinationHubName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
