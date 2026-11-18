"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  CheckCircle2,
  Package,
  MessageSquare,
  ShieldCheck,
  Copy,
  FileCheck,
  Calendar,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES } from "@/config/routes";
import { ParcelStatus } from "@dhruto/contracts";
import type { CustomerDelivery } from "../../hooks/use-customer-deliveries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination";
import { useFormatters } from "@/lib/format";

interface CustomerDeliveriesListProps {
  deliveries: CustomerDelivery[];
  activeTrackingCode: string | null;
  incomingCount: number;
  deliveredCount: number;
  onSelectActive: (code: string) => void;
  onRemove: (code: string) => void;
  onCopy: (text: string, label: string) => void;
  onOpenReschedule: (code: string) => void;
  onOpenPod: (delivery: CustomerDelivery) => void;
}

export function CustomerDeliveriesList({
  deliveries,
  activeTrackingCode,
  incomingCount,
  deliveredCount,
  onSelectActive,
  onRemove,
  onCopy,
  onOpenReschedule,
  onOpenPod,
}: CustomerDeliveriesListProps) {
  const t = useTranslations("Customer");
  const { bdt } = useFormatters();
  const [activeFilter, setActiveFilter] = React.useState<"ALL" | "ACTIVE" | "DELIVERED">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 350);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeFilter]);

  const filteredDeliveries = React.useMemo(() => {
    return deliveries.filter((item) => {
      if (activeFilter === "ACTIVE" && item.status === ParcelStatus.DELIVERED) return false;
      if (activeFilter === "DELIVERED" && item.status !== ParcelStatus.DELIVERED) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        return (
          item.trackingCode.toLowerCase().includes(q) ||
          item.merchantName.toLowerCase().includes(q) ||
          item.itemsDescription.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          (item.riderName && item.riderName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [deliveries, activeFilter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / pageSize));
  const paginatedDeliveries = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeliveries.slice(start, start + pageSize);
  }, [filteredDeliveries, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: `${t("filterAll")} (${deliveries.length})` },
            { id: "ACTIVE", label: `${t("filterActive")} (${incomingCount})` },
            { id: "DELIVERED", label: `${t("filterDelivered")} (${deliveredCount})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as typeof activeFilter)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                activeFilter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by code, merchant, item..."
            className="h-10 w-full rounded-2xl bg-field pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-field-hover focus:bg-surface"
          />
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {filteredDeliveries.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center text-xs text-muted-foreground">
            No deliveries match your current search or filter criteria.
          </div>
        ) : (
          paginatedDeliveries.map((delivery) => {
            const isDelivered = delivery.status === ParcelStatus.DELIVERED;
            const isSpotlighted = delivery.trackingCode === activeTrackingCode;

            return (
              <div
                key={delivery.id}
                className={`group relative flex flex-col justify-between gap-4 rounded-2xl p-5 transition-all sm:flex-row sm:items-center ${
                  isSpotlighted
                    ? "bg-primary-soft/20"
                    : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => onSelectActive(delivery.trackingCode)}
                    title="Pin to spotlight"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold transition-transform group-hover:scale-105 ${
                      isDelivered
                        ? "bg-success-soft text-success"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    {isDelivered ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-foreground">
                        {delivery.trackingCode}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-bold text-foreground">
                        {delivery.merchantName}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isDelivered
                            ? "bg-success-soft text-success-soft-foreground"
                            : "bg-primary-soft text-primary-soft-foreground"
                        }`}
                      >
                        {delivery.statusLabel}
                      </span>
                      {isSpotlighted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                          ★ Active
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">
                      {delivery.itemsDescription}
                    </p>

                    {delivery.deliveryNote ? (
                      <p className="text-[11px] text-warning-soft-foreground font-medium flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Note: {delivery.deliveryNote}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      <span>
                        {isDelivered ? delivery.deliveredAt || "Delivered" : delivery.eta}
                      </span>
                      <span>•</span>
                      <span>
                        COD:{" "}
                        <strong className="text-foreground">
                          {delivery.codAmount === null
                            ? "Not disclosed"
                            : delivery.codAmount > 0 && !delivery.isPaid
                              ? bdt(delivery.codAmount)
                              : "Prepaid"}
                        </strong>
                      </span>
                      {delivery.otp ? (
                        <>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopy(delivery.otp, `Delivery OTP for ${delivery.trackingCode}`);
                            }}
                            title="Click to copy delivery OTP"
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-primary bg-primary-soft/80 hover:bg-primary-soft px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer group/otp"
                          >
                            <ShieldCheck className="h-3 w-3 text-primary" />
                            <span>OTP: {delivery.otp}</span>
                            <Copy className="h-2.5 w-2.5 ml-0.5 opacity-70 group-hover/otp:opacity-100 transition-opacity" />
                          </button>
                        </>
                      ) : null}
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{delivery.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  {!isSpotlighted ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectActive(delivery.trackingCode)}
                      className="h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Spotlight
                    </Button>
                  ) : null}

                  {isDelivered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenPod(delivery)}
                      className="h-9 gap-1.5 rounded-xl bg-background/80 hover:bg-surface-muted text-xs font-semibold"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      View POD
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenReschedule(delivery.trackingCode)}
                      className="h-9 gap-1.5 rounded-xl bg-background/80 hover:bg-surface-muted text-xs font-semibold"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Reschedule
                    </Button>
                  )}

                  <Link href={`${CUSTOMER_ROUTES.tracking}/${delivery.trackingCode}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 gap-1 rounded-xl bg-primary-soft text-primary text-xs font-semibold hover:bg-primary/20"
                    >
                      Track
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>

                  <button
                    type="button"
                    onClick={() => onRemove(delivery.trackingCode)}
                    title="Remove from tracked list"
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-surface-muted/60"
                    aria-label="Remove delivery"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Centralized Pagination */}
      {filteredDeliveries.length > 0 && (
        <div className="pt-2 rounded-2xl bg-card p-2">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredDeliveries.length}
            limit={pageSize}
            onPageChange={setCurrentPage}
            onLimitChange={(newLimit) => {
              setPageSize(newLimit);
              setCurrentPage(1);
            }}
            showFirstLast={true}
          />
        </div>
      )}
    </div>
  );
}
