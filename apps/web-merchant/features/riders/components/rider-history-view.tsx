"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button, Badge } from "@dhruto/ui";
import { History } from "lucide-react";
import { useGetRiderHistoryQuery } from "../api/riders.api";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { EmptyState } from "@/components/feedback/states";
import { useFormatters } from "@/lib/format";

type HistoryFilter = "ALL" | "DELIVERED" | "FAILED";

const DELIVERED_GROUP = ["DELIVERED", "CASH_PENDING", "CASH_VERIFIED"];
const FAILED_GROUP = ["DELIVERY_ATTEMPTED", "RESCHEDULED"];

/**
 * Delivery history, newest first. The server returns the rider's recent
 * closed tasks (limit 100); group filters apply on that window, which covers
 * real rider volumes without pretending to paginate server-side.
 */
export function RiderHistoryView() {
  const t = useTranslations("Rider");
  const { date: fmtDate } = useFormatters();
  const [filter, setFilter] = React.useState<HistoryFilter>("ALL");

  const { data, isLoading, refetch } = useGetRiderHistoryQuery({ page: 1, limit: 100 });

  const items = React.useMemo(() => {
    const all = data?.data?.items ?? [];
    if (filter === "DELIVERED") return all.filter((item) => DELIVERED_GROUP.includes(item.status));
    if (filter === "FAILED") return all.filter((item) => FAILED_GROUP.includes(item.status));
    return all;
  }, [data, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {(
          [
            { key: "ALL", label: t("history.filterAll") },
            { key: "DELIVERED", label: t("history.filterDelivered") },
            { key: "FAILED", label: t("history.filterFailed") },
          ] as Array<{ key: HistoryFilter; label: string }>
        ).map((entry) => (
          <Button
            key={entry.key}
            size="sm"
            variant={filter === entry.key ? "default" : "outline"}
            onClick={() => setFilter(entry.key)}
            className="h-9 text-xs"
          >
            {entry.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-9 text-xs">
          {t("refresh")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={History}
                title={t("history.empty")}
                description={t("history.emptyDescription")}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={RIDER_ROUTES.task(item.id)}
                    className="flex flex-wrap items-center gap-2 px-4 py-3"
                  >
                    <span className="font-mono text-xs font-bold text-foreground">
                      {item.trackingCode}
                    </span>
                    <Badge
                      variant={DELIVERED_GROUP.includes(item.status) ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {item.status}
                    </Badge>
                    <span className="w-full truncate text-xs text-muted-foreground">
                      {item.recipientName}
                      {item.codCollected !== null && item.codCollected > 0
                        ? ` · ${t("history.codCollected", { amount: item.codCollected.toLocaleString() })}`
                        : ""}
                    </span>
                    <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                      {fmtDate(item.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
