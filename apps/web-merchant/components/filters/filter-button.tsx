"use client";

import * as React from "react";
import { ListFilter } from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { cn } from "@/lib/cn";

export interface FilterButtonProps {
  /** Number of active filters. Zero hides the count badge. */
  count?: number;
  label: string;
  onClick: () => void;
  expanded?: boolean;
  className?: string;
}

/**
 * Mobile filter trigger with selected-count badge. Opens a FilterSheet.
 * Desktop inline controls stay visible; this button renders below `lg`.
 */
export function FilterButton({ count = 0, label, onClick, expanded, className }: FilterButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn("h-11 gap-2 lg:hidden", className)}
    >
      <ListFilter className="h-4 w-4" aria-hidden="true" />
      {label}
      {count > 0 ? (
        <Badge variant="secondary" className="ml-1 tabular-nums" aria-label={`${count} active`}>
          {count}
        </Badge>
      ) : null}
    </Button>
  );
}
