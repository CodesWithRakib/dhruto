import { useLocale } from "next-intl";

/**
 * Centralized Bangladesh logistics formatters (single source of truth).
 * Locale-aware; Asia/Dhaka timezone for timestamps. Replaces ~100 inline
 * `৳${x.toLocaleString()}` / `new Date().toLocaleString()` call sites.
 */

function localeTag(locale: string): string {
  return locale === "bn" ? "bn-BD" : "en-US";
}

/** BDT amount → `৳1,250` / `৳১,২৫০` ( Bangla digits in bn locale). */
export function formatBDT(amount: number | string | null | undefined, locale = "en"): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;
  const digits = new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
  return `৳${digits}`;
}

/** Plain localized integer. */
export function formatNumber(value: number | string | null | undefined, locale = "en"): string {
  const numeric = typeof value === "string" ? Number(value) : (value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: 0 }).format(safe);
}

/** API UTC instant → localized date string (Asia/Dhaka). */
export function formatDate(
  value: string | Date | null | undefined,
  locale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

/** API UTC instant → localized date + time (Asia/Dhaka). */
export function formatDateTime(value: string | Date | null | undefined, locale = "en"): string {
  return formatDate(value, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** API UTC instant → localized time only (Asia/Dhaka). */
export function formatTime(value: string | Date | null | undefined, locale = "en"): string {
  return formatDate(value, locale, {
    hour: "2-digit",
    minute: "2-digit",
    year: undefined,
    month: undefined,
    day: undefined,
  });
}

/** React hook variant that follows the active next-intl locale. */
export function useFormatters(): {
  bdt: (amount: number | string | null | undefined) => string;
  number: (value: number | string | null | undefined) => string;
  date: (value: string | Date | null | undefined) => string;
  dateTime: (value: string | Date | null | undefined) => string;
  time: (value: string | Date | null | undefined) => string;
} {
  const locale = useLocale();
  return {
    bdt: (amount) => formatBDT(amount, locale),
    number: (value) => formatNumber(value, locale),
    date: (value) => formatDate(value, locale),
    dateTime: (value) => formatDateTime(value, locale),
    time: (value) => formatTime(value, locale),
  };
}
