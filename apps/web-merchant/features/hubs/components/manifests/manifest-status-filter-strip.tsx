"use client";

import * as React from "react";
import { ManifestStatus } from "@dhruto/contracts";

interface ManifestStatusFilterStripProps {
  statusFilter: "ALL" | ManifestStatus;
  setStatusFilter: (s: "ALL" | ManifestStatus) => void;
  statusCounts: {
    ALL: number;
    [ManifestStatus.CREATED]: number;
    [ManifestStatus.DISPATCHED]: number;
    [ManifestStatus.IN_TRANSIT]: number;
    [ManifestStatus.RECEIVED]: number;
    [ManifestStatus.RECONCILED]: number;
  };
  onFilterChange: () => void;
}

export function ManifestStatusFilterStrip({
  statusFilter,
  setStatusFilter,
  statusCounts,
  onFilterChange,
}: ManifestStatusFilterStripProps) {
  const items = [
    { key: "ALL" as const, label: `All (${statusCounts.ALL})` },
    { key: ManifestStatus.CREATED, label: `Created (${statusCounts[ManifestStatus.CREATED]})` },
    { key: ManifestStatus.DISPATCHED, label: `Dispatched (${statusCounts[ManifestStatus.DISPATCHED]})` },
    { key: ManifestStatus.IN_TRANSIT, label: `In Transit (${statusCounts[ManifestStatus.IN_TRANSIT]})` },
    { key: ManifestStatus.RECEIVED, label: `Received (${statusCounts[ManifestStatus.RECEIVED]})` },
    { key: ManifestStatus.RECONCILED, label: `Reconciled (${statusCounts[ManifestStatus.RECONCILED]})` },
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
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
