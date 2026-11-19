"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { getAllDistricts, getThanasForDistrict } from "@/lib/data/bangladesh-locations";
import { Check, ChevronDown, MapPin, X } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Shared accessible combobox (WAI-ARIA combobox + listbox pattern).    */
/* Free text is always allowed; options are suggestions.               */
/* ------------------------------------------------------------------ */

interface ComboOption {
  value: string;
  secondary?: string;
  badge?: string;
  badgeMono?: boolean;
}

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  emptyMessage: React.ReactNode;
  placeholder: string;
  ariaLabel: string;
  clearLabel: string;
  toggleLabel: string;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  name: string;
  title?: string;
  withIcon?: boolean;
  className?: string;
}

function LocationCombobox({
  value,
  onChange,
  options,
  emptyMessage,
  placeholder,
  ariaLabel,
  clearLabel,
  toggleLabel,
  disabled = false,
  error = false,
  id,
  name,
  title,
  withIcon = false,
  className,
}: LocationComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => setInputValue(value), [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keep the highlighted option in view while moving with the keyboard.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = (next: string) => {
    setInputValue(next);
    onChange(next);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      if (options.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + options.length) % options.length);
    } else if (e.key === "Enter" && isOpen && activeIndex >= 0 && options[activeIndex]) {
      e.preventDefault();
      select(options[activeIndex].value);
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const activeId = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          type="text"
          id={id}
          name={name}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setActiveIndex(-1);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          title={title}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen ? activeId : undefined}
          aria-invalid={error || undefined}
          className={cn(
            "h-11 w-full rounded-2xl bg-field pr-9 text-xs font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground placeholder:font-normal",
            "hover:bg-field-hover focus:bg-surface focus:ring-2 focus:ring-primary/20",
            withIcon ? "pl-10" : "pl-4",
            error && "bg-danger-soft/60",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
        {withIcon && (
          <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-primary pointer-events-none" />
        )}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => select("")}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label={clearLabel}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label={toggleLabel}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="dhruto-popover absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-popover p-1.5 animate-in fade-in-0 zoom-in-95"
        >
          {options.length === 0 ? (
            <div className="py-4 px-3 text-center text-xs text-muted-foreground">{emptyMessage}</div>
          ) : (
            options.map((option, index) => {
              const isSelected =
                inputValue.trim().toLowerCase() === option.value.toLowerCase() ||
                (option.secondary !== undefined && inputValue.trim() === option.secondary);
              const isActive = index === activeIndex;
              return (
                <div
                  key={option.value}
                  id={`${listboxId}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(option.value);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors text-left",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : isActive
                        ? "bg-surface text-foreground"
                        : "text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold">{option.value}</span>
                    {option.secondary && (
                      <span
                        className={cn(
                          "text-[11px]",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {option.secondary}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {option.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          option.badgeMono && "font-mono rounded-md",
                          isSelected ? "bg-white/20 text-white" : "bg-surface-muted text-muted-foreground",
                        )}
                      >
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export interface DistrictSelectProps {
  value?: string;
  onChange: (district: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

export function DistrictSelect({
  value = "",
  onChange,
  disabled = false,
  error = false,
  placeholder = "Select or type delivery district (64 Districts)",
  id,
  name = "district",
  className,
  "aria-label": ariaLabel,
}: DistrictSelectProps) {
  const [query, setQuery] = useState(value);
  useEffect(() => setQuery(value), [value]);
  const allDistricts = useMemo(() => getAllDistricts(), []);

  const options = useMemo<ComboOption[]>(() => {
    const q = query.trim().toLowerCase();
    return allDistricts
      .filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.nameBn.includes(q) ||
          d.aliases.some((a) => a.toLowerCase().includes(q)) ||
          (d.division && d.division.toLowerCase().includes(q)),
      )
      .map((d) => ({ value: d.name, secondary: d.nameBn, badge: d.division ?? undefined }));
  }, [allDistricts, query]);

  return (
    <LocationCombobox
      value={value}
      onChange={(next) => {
        setQuery(next);
        onChange(next);
      }}
      options={options}
      emptyMessage={`No preset districts matching "${query}". Press Tab or Enter to keep custom text.`}
      placeholder={placeholder}
      ariaLabel={ariaLabel ?? "District"}
      clearLabel="Clear district"
      toggleLabel="Toggle district dropdown"
      disabled={disabled}
      error={error}
      id={id}
      name={name}
      withIcon
      className={className}
    />
  );
}

export interface ThanaSelectProps {
  districtName?: string;
  value?: string;
  onChange: (thana: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

export function ThanaSelect({
  districtName,
  value = "",
  onChange,
  disabled = false,
  error = false,
  placeholder = "Select or type Thana / Upazila",
  id,
  name = "thana",
  className,
  "aria-label": ariaLabel,
}: ThanaSelectProps) {
  const [query, setQuery] = useState(value);
  useEffect(() => setQuery(value), [value]);
  const availableThanas = useMemo(() => getThanasForDistrict(districtName), [districtName]);

  const options = useMemo<ComboOption[]>(() => {
    const q = query.trim().toLowerCase();
    return availableThanas
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.nameBn.includes(q) ||
          (t.postalCode && t.postalCode.includes(q)),
      )
      .map((t) => ({
        value: t.name,
        secondary: t.nameBn,
        badge: t.postalCode || undefined,
        badgeMono: true,
      }));
  }, [availableThanas, query]);

  const emptyMessage =
    availableThanas.length === 0 ? (
      !districtName ? (
        "Select a district above to view its thanas, or type an area name."
      ) : (
        `Custom thana mode active. You can type any area or thana in ${districtName}.`
      )
    ) : (
      <span className="space-y-1 block">
        <span className="block">No preset thanas found for &quot;{query}&quot;.</span>
        <span className="block text-[11px] text-primary">Custom name will be saved.</span>
      </span>
    );

  return (
    <LocationCombobox
      value={value}
      onChange={(next) => {
        setQuery(next);
        onChange(next);
      }}
      options={options}
      emptyMessage={emptyMessage}
      placeholder={placeholder}
      ariaLabel={ariaLabel ?? "Thana / Upazila"}
      clearLabel="Clear thana"
      toggleLabel="Toggle thana dropdown"
      title={!districtName ? "Select a district first to view suggested thanas" : undefined}
      disabled={disabled}
      error={error}
      id={id}
      name={name}
      className={className}
    />
  );
}
