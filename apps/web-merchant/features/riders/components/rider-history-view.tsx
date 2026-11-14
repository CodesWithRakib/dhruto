import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import {
  History,
  Package,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X,
  RotateCcw,
} from "lucide-react";
import { useGetRiderHistoryQuery } from "../api/riders.api";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { EmptyState } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";

type HistoryFilter = "ALL" | "DELIVERED" | "FAILED";

const DELIVERED_GROUP = ["DELIVERED", "CASH_PENDING", "CASH_VERIFIED"];
const FAILED_GROUP = ["DELIVERY_ATTEMPTED", "RESCHEDULED"];

function HistoryStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "CASH_PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
          <Clock className="h-3 w-3 text-amber-500" />
          Cash Pending
        </span>
      );
    case "CASH_VERIFIED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[10px] font-bold text-success-soft-foreground">
          <ShieldCheck className="h-3 w-3 text-success" />
          Cash Verified
        </span>
      );
    case "DELIVERED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[10px] font-bold text-success-soft-foreground">
          <CheckCircle2 className="h-3 w-3 text-success" />
          Delivered
        </span>
      );
    case "DELIVERY_ATTEMPTED":
    case "RESCHEDULED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-[10px] font-bold text-danger-soft-foreground">
          <AlertTriangle className="h-3 w-3 text-danger" />
          Attempt Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
          {status}
        </span>
      );
  }
}

/**
 * Delivery history, newest first. The server returns the rider's recent
 * closed tasks (limit 100); group filters apply on that window, which covers
 * real rider volumes without pretending to paginate server-side.
 */
export function RiderHistoryView() {
  const t = useTranslations("Rider");
  const { date: fmtDate, bdt } = useFormatters();
  const [filter, setFilter] = React.useState<HistoryFilter>("ALL");
  const [search, setSearch] = React.useState("");

  const { data, isLoading, isFetching, refetch } = useGetRiderHistoryQuery({ page: 1, limit: 100 });

  const allItems = data?.data?.items ?? [];

  const counts = React.useMemo(() => {
    return {
      ALL: allItems.length,
      DELIVERED: allItems.filter((item) => DELIVERED_GROUP.includes(item.status)).length,
      FAILED: allItems.filter((item) => FAILED_GROUP.includes(item.status)).length,
    };
  }, [allItems]);

  const filteredItems = React.useMemo(() => {
    let result = allItems;
    if (filter === "DELIVERED") {
      result = result.filter((item) => DELIVERED_GROUP.includes(item.status));
    } else if (filter === "FAILED") {
      result = result.filter((item) => FAILED_GROUP.includes(item.status));
    }
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (item) =>
          item.trackingCode.toLowerCase().includes(query) ||
          item.recipientName.toLowerCase().includes(query) ||
          (item.district && item.district.toLowerCase().includes(query)),
      );
    }
    return result;
  }, [allItems, filter, search]);

  const filters: Array<{ key: HistoryFilter; label: string; count: number }> = [
    { key: "ALL", label: t("history.filterAll"), count: counts.ALL },
    { key: "DELIVERED", label: t("history.filterDelivered"), count: counts.DELIVERED },
    { key: "FAILED", label: t("history.filterFailed"), count: counts.FAILED },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-surface-elevated p-5 space-y-4">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search history by tracking code, recipient or district..."
            aria-label="Search delivery history"
            className="h-11 rounded-2xl border-0 bg-surface-muted/60 pl-10 pr-10 text-sm focus:bg-background"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {filters.map((entry) => {
              const isActive = filter === entry.key;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setFilter(entry.key)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <span>{entry.label}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-background/80 text-muted-foreground"
                    }`}
                  >
                    {entry.count}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-9 w-9 shrink-0 rounded-xl p-0 bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label={t("refresh")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-surface-elevated">
        <div>
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
              <p>{t("loading")}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={History}
                title={search || filter !== "ALL" ? "No matching history records" : t("history.empty")}
                description={
                  search || filter !== "ALL"
                    ? "Try adjusting your search query or status filter to see other historical deliveries."
                    : t("history.emptyDescription")
                }
                action={
                  search || filter !== "ALL" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setFilter("ALL");
                      }}
                      className="gap-1.5 rounded-xl bg-surface-muted/60 text-xs font-semibold"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/20">
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={RIDER_ROUTES.task(item.id)}
                    className="group block px-4 py-4 transition-all duration-200 hover:bg-surface-muted/30 sm:px-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Package className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground transition-colors group-hover:text-primary">
                              {item.trackingCode}
                            </span>
                            <HistoryStatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.recipientName}
                            {item.district ? ` · ${item.district}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pl-13 sm:justify-end sm:pl-0">
                        {item.codCollected !== null && item.codCollected > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-200">
                            Collected {bdt(item.codCollected)}
                          </span>
                        ) : null}
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {fmtDate(item.updatedAt)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
