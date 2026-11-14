"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  getAllDistricts,
  getThanasForDistrict,
} from "@/lib/data/bangladesh-locations";
import { ChevronDown, Check, MapPin, X } from "lucide-react";
import { cn } from "@/lib/cn";

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
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal input value if external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allDistricts = useMemo(() => getAllDistricts(), []);

  // Filter districts based on what user has typed
  const filteredDistricts = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return allDistricts;
    return allDistricts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.nameBn.includes(q) ||
        d.aliases.some((a) => a.toLowerCase().includes(q)) ||
        (d.division && d.division.toLowerCase().includes(q)),
    );
  }, [allDistricts, inputValue]);

  const handleSelect = (districtName: string) => {
    setInputValue(districtName);
    onChange(districtName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    onChange(text);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          type="text"
          id={id}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-label={ariaLabel ?? "District"}
          aria-expanded={isOpen}
          className={cn(
            "h-11 w-full rounded-2xl border-0 bg-surface-muted/60 pl-10 pr-9 text-xs font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground placeholder:font-normal",
            "hover:bg-surface-muted focus:bg-background focus:ring-2 focus:ring-primary/20",
            error && "ring-2 ring-destructive/40 bg-destructive/5",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
        <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-primary pointer-events-none" />
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setInputValue("");
                onChange("");
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label="Clear district"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label="Toggle district dropdown"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-surface-elevated p-1.5 shadow-2xl border-0 ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
          {filteredDistricts.length === 0 ? (
            <div className="py-4 px-3 text-center text-xs text-muted-foreground">
              No preset districts matching "{inputValue}". Press Tab or Enter to keep custom text.
            </div>
          ) : (
            filteredDistricts.map((d) => {
              const isSelected =
                inputValue.trim().toLowerCase() === d.name.toLowerCase() ||
                inputValue.trim() === d.nameBn;
              return (
                <button
                  key={d.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(d.name);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors text-left",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-foreground hover:bg-surface-muted/80",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold">{d.name}</span>
                    <span
                      className={cn(
                        "text-[11px]",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {d.nameBn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {d.division && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-surface-muted text-muted-foreground",
                        )}
                      >
                        {d.division}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
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
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableThanas = useMemo(() => {
    return getThanasForDistrict(districtName);
  }, [districtName]);

  const filteredThanas = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return availableThanas;
    return availableThanas.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.nameBn.includes(q) ||
        (t.postalCode && t.postalCode.includes(q)),
    );
  }, [availableThanas, inputValue]);

  const handleSelect = (thanaName: string) => {
    setInputValue(thanaName);
    onChange(thanaName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    onChange(text);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          type="text"
          id={id}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          title={!districtName ? "Select a district first to view suggested thanas" : undefined}
          disabled={disabled}
          autoComplete="off"
          aria-label={ariaLabel ?? "Thana / Upazila"}
          aria-expanded={isOpen}
          className={cn(
            "h-11 w-full rounded-2xl border-0 bg-surface-muted/60 pl-4 pr-9 text-xs font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground placeholder:font-normal",
            "hover:bg-surface-muted focus:bg-background focus:ring-2 focus:ring-primary/20",
            error && "ring-2 ring-destructive/40 bg-destructive/5",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setInputValue("");
                onChange("");
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label="Clear thana"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label="Toggle thana dropdown"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-surface-elevated p-1.5 shadow-2xl border-0 ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
          {availableThanas.length === 0 ? (
            <div className="py-4 px-3 text-center text-xs text-muted-foreground">
              {!districtName
                ? "Select a district above to view its thanas, or type an area name."
                : `Custom thana mode active. You can type any area or thana in ${districtName}.`}
            </div>
          ) : filteredThanas.length === 0 ? (
            <div className="py-3 px-3 text-center text-xs text-muted-foreground space-y-1">
              <p>No preset thanas found for "{inputValue}".</p>
              <p className="text-[11px] text-primary">Custom name will be saved.</p>
            </div>
          ) : (
            filteredThanas.map((t) => {
              const isSelected =
                inputValue.trim().toLowerCase() === t.name.toLowerCase() ||
                inputValue.trim() === t.nameBn;
              return (
                <button
                  key={t.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(t.name);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors text-left",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-foreground hover:bg-surface-muted/80",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold">{t.name}</span>
                    <span
                      className={cn(
                        "text-[11px]",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {t.nameBn}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {t.postalCode && (
                      <span
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded-md",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-surface-muted text-muted-foreground",
                        )}
                      >
                        {t.postalCode}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
