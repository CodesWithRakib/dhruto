"use client";

import * as React from "react";
import { BagStatus } from "@dhruto/contracts";

interface BagStatusFilterStripProps {
  statusFilter: "ALL" | BagStatus;
  setStatusFilter: (s: "ALL" | BagStatus) => void;
  statusCounts: {
    ALL: number;
    [BagStatus.OPEN]: number;
    [BagStatus.SEALED]: number;
    [BagStatus.IN_TRANSIT]: number;
    [BagStatus.RECEIVED]: number;
  };
  onFilterChange: () => void;
}

export function BagStatusFilterStrip({
  statusFilter,
  setStatusFilter,
  statusCounts,
  onFilterChange,
}: BagStatusFilterStripProps) {
  const items = [
    { key: "ALL" as const, label: `All (${statusCounts.ALL})` },
    { key: BagStatus.OPEN, label: `Open (${statusCounts[BagStatus.OPEN]})` },
    { key: BagStatus.SEALED, label: `Sealed (${statusCounts[BagStatus.SEALED]})` },
    { key: BagStatus.IN_TRANSIT, label: `In Transit (${statusCounts[BagStatus.IN_TRANSIT]})` },
    { key: BagStatus.RECEIVED, label: `Received (${statusCounts[BagStatus.RECEIVED]})` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => {
            setStatusFilter(item.key);
            onFilterChange();
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            statusFilter === item.key
              ? "bg-primary text-primary-foreground"
              : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
