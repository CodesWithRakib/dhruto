"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@dhruto/ui";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  debounceMs?: number;
  loading?: boolean;
  className?: string;
  id?: string;
}

/**
 * Shared search input: controlled, debounced, with clear action.
 * The parent receives the debounced value (single API request per pause),
 * while the field itself stays responsive. Pair with URL query state so
 * refresh/back/share preserve the search.
 */
export function DebouncedSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  debounceMs = 400,
  loading,
  className,
  id,
}: DebouncedSearchInputProps) {
  const [text, setText] = React.useState(value);
  const debounced = useDebouncedValue(text, debounceMs);
  const firstRender = React.useRef(true);

  // Keep local text in sync when the value is reset externally (clear-all).
  React.useEffect(() => {
    setText(value);
  }, [value]);

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (debounced !== value) onChange(debounced);
  }, [debounced, value, onChange]);

  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={inputId}
        type="search"
        role="searchbox"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setText("");
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="pl-9 pr-16"
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : null}
        {text ? (
          <button
            type="button"
            onClick={() => setText("")}
            aria-label="Clear search"
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
