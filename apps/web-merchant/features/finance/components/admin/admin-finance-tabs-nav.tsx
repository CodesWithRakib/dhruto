"use client";

import * as React from "react";

export type AdminTab = "payouts" | "journal" | "discrepancies" | "adjust" | "reports" | "check";

export interface TabEntry {
  key: AdminTab;
  label: string;
  count?: number;
}

interface AdminFinanceTabsNavProps {
  tabs: TabEntry[];
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminFinanceTabsNav({ tabs, currentTab, onTabChange }: AdminFinanceTabsNavProps) {
  return (
    <div
      className="flex w-fit max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl bg-surface-elevated p-1.5"
      role="tablist"
    >
      {tabs.map((entry) => {
        const isActive = currentTab === entry.key;
        return (
          <button
            key={entry.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(entry.key)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <span>{entry.label}</span>
            {typeof entry.count === "number" ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-surface-muted text-muted-foreground"
                }`}
              >
                {entry.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
