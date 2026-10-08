"use client";

import * as React from "react";
import { Button, Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@dhruto/ui";
import { ActiveFilters, type ActiveFilter } from "@/components/active-filters";

export interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  activeFilters: ActiveFilter[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  applyLabel?: string;
  clearLabel?: string;
}

/**
 * Mobile filter drawer. Hosts the same filter controls as the desktop
 * toolbar (passed as children), with active-filter chips, clear-all and a
 * single Apply action. Desktop keeps inline controls — this sheet only
 * renders the mobile entry point.
 */
export function FilterSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  activeFilters,
  onRemoveFilter,
  onClearAll,
  applyLabel = "Apply",
  clearLabel = "Clear all",
}: FilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-5 sm:max-w-lg sm:rounded-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-h3">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="space-y-4 py-4">{children}</div>
        <ActiveFilters filters={activeFilters} onRemove={onRemoveFilter} onClearAll={onClearAll} />
        <SheetFooter className="flex-row justify-between gap-2 pt-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
            {clearLabel}
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            {applyLabel} {activeFilters.length > 0 ? `(${activeFilters.length})` : null}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
