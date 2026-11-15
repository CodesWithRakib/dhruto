"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";

interface ReturnsToolbarProps {
  t: (key: string) => string;
  activeTab: "ALL" | ParcelStatus;
  onTabChange: (tab: "ALL" | ParcelStatus) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export function ReturnsToolbar({
  t,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
}: ReturnsToolbarProps) {
  const tabs: { id: "ALL" | ParcelStatus; labelKey: string }[] = [
    { id: "ALL", labelKey: "tabAll" },
    { id: ParcelStatus.RTO_INITIATED, labelKey: "tabInitiated" },
    { id: ParcelStatus.RETURN_IN_TRANSIT, labelKey: "tabInTransit" },
    { id: ParcelStatus.RETURNED_TO_MERCHANT, labelKey: "tabRestocked" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Status Lens Pills */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-[1.02]"
                  : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-9.5 border-border/80 bg-surface-muted/60 pl-9.5 text-xs rounded-xl focus:bg-surface-elevated transition-colors"
        />
      </div>
    </div>
  );
}
