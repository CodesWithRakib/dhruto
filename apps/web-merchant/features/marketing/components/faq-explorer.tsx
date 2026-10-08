"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, SearchX } from "lucide-react";
import { Input } from "@dhruto/ui";

export interface FaqExplorerItem {
  question: string;
  answer: string;
}

/**
 * Searchable FAQ list.
 *
 * A long FAQ page needs filtering, not just a taller accordion. Filtering is
 * client-side and cheap (a handful of items), so no state leaves the page.
 * Uses native `<details>` so keyboard and screen-reader behaviour come free.
 */
export function FaqExplorer({ items }: { items: FaqExplorerItem[] }) {
  const t = useTranslations("Faq");
  const [query, setQuery] = React.useState("");

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? items.filter((item) =>
        `${item.question} ${item.answer}`.toLowerCase().includes(normalized),
      )
    : items;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-12 pl-10"
        />
      </div>

      <p className="mt-3 text-caption text-muted-foreground" role="status" aria-live="polite">
        {filtered.length === items.length
          ? t("resultAll", { count: items.length })
          : t("resultFiltered", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-surface p-10 text-center shadow-soft">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-h4 font-bold text-foreground">{t("noResults")}</h3>
          <p className="mt-1 text-body text-pretty text-muted-foreground">{t("noResultsHint")}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3.5">
          {filtered.map((item) => (
            <details
              key={item.question}
              className="group overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-soft transition-colors hover:border-primary/40 open:border-primary/50"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-base font-bold text-foreground select-none sm:p-6 sm:text-lg">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-surface-muted/60 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:border-primary/30 group-open:bg-primary/10 group-open:text-primary"
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </summary>
              <div className="mt-1 border-t border-border/30 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <p className="pt-3 text-body leading-relaxed text-muted-foreground">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
