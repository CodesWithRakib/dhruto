"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Input } from "@dhruto/ui";
import { cn } from "@/lib/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxGroup {
  heading: string;
  options: ComboboxOption[];
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[] | ComboboxGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

function isGrouped(options: ComboboxOption[] | ComboboxGroup[]): options is ComboboxGroup[] {
  const first = options[0];
  return first !== undefined && "heading" in first;
}

function matches(option: ComboboxOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    (option.hint ?? "").toLowerCase().includes(q)
  );
}

/**
 * Searchable single-select for large datasets — districts, merchants, hubs.
 * Built on DropdownMenu + Input (no new deps): type to filter, grouped
 * headings, selected check, full keyboard support via native menu items.
 * For small fixed sets (<8 options) prefer `Select`.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches found.",
  ariaLabel,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      const frame = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open ]);

  const groups: ComboboxGroup[] = React.useMemo(() => {
    const list = isGrouped(options) ? options : [{ heading: "", options }];
    return list
      .map((group) => ({ ...group, options: group.options.filter((o) => matches(o, query)) }))
      .filter((group) => group.options.length > 0);
  }, [options, query]);

  const selected = React.useMemo(() => {
    const flat = isGrouped(options) ? options.flatMap((g) => g.options) : options;
    return flat.find((o) => o.value === value);
  }, [options, value]);

  const total = groups.reduce((n, g) => n + g.options.length, 0);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={cn("h-11 w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-xl border border-border/70 bg-popover p-1.5 shadow-lift"
      >
        <div className="relative p-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 border-transparent bg-surface-muted/60 pl-8 focus-visible:border-primary"
          />
        </div>
        <div className="max-h-64 overflow-y-auto" role="listbox" aria-label={ariaLabel ?? placeholder}>
          {groups.map((group) => (
            <div key={group.heading || "all"}>
              {group.heading ? (
                <p className="px-2.5 pb-1 pt-2 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.heading}
                </p>
              ) : null}
              {group.options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm outline-none transition-colors duration-fast",
                      "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/40",
                      "disabled:pointer-events-none disabled:opacity-50",
                      active && "bg-primary-soft/60",
                    )}
                  >
                    <Check
                      className={cn("h-4 w-4 shrink-0", active ? "text-primary opacity-100" : "opacity-0")}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{option.label}</span>
                      {option.hint ? (
                        <span className="block truncate text-caption text-muted-foreground">{option.hint}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {total === 0 ? (
            <p className="px-2.5 py-6 text-center text-body-sm text-muted-foreground">{emptyText}</p>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
