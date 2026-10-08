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
  clearLabel?: string;
  debounceMs?: number;
  loading?: boolean;
  className?: string;
  id?: string;
  /**
   * When true, pressing `/` anywhere outside a text field focuses this
   * input (power-user shortcut for operational list pages).
   */
  slashShortcut?: boolean;
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
  clearLabel = "Clear search",
  debounceMs = 400,
  loading,
  className,
  id,
  slashShortcut = false,
}: DebouncedSearchInputProps) {
  const [text, setText] = React.useState(value);
  const debounced = useDebouncedValue(text, debounceMs);
  const firstRender = React.useRef(true);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // `/` focuses search from anywhere except an editable field. Scoped to
  // this input via opt-in so pages with multiple fields never steal keys.
  React.useEffect(() => {
    if (!slashShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [slashShortcut]);

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
    <div className={cn("relative w-full sm:max-w-xs", className)} role="search">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        id={inputId}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && text) {
            event.stopPropagation();
            setText("");
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="pl-9 pr-16 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : null}
        {text ? (
          <button
            type="button"
            onClick={() => {
              setText("");
              onChange("");
            }}
            aria-label={clearLabel}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
