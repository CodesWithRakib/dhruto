"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileCheck, Search, Calendar, ArrowRight } from "lucide-react";
import { Button, Card, CardContent } from "@dhruto/ui";
import { PageHeader } from "@/components/page-header";
import { PodModal } from "./pod-modal";
import { useCustomerDeliveries, type CustomerDelivery } from "../hooks/use-customer-deliveries";
import { ParcelStatus } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { CUSTOMER_ROUTES } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";

export function CustomerHistoryView() {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);
  const { deliveries } = useCustomerDeliveries();

  const [search, setSearch] = React.useState("");
  const [selectedPod, setSelectedPod] = React.useState<CustomerDelivery | null>(null);
  const [podOpen, setPodOpen] = React.useState(false);

  // Delivered or returned orders
  const historyList = React.useMemo(() => {
    return deliveries.filter(
      (d) =>
        d.status === ParcelStatus.DELIVERED ||
        d.status === ParcelStatus.RETURNED_TO_MERCHANT ||
        d.status === "DELIVERED"
    );
  }, [deliveries]);

  const filteredHistory = React.useMemo(() => {
    if (!search.trim()) return historyList;
    const q = search.toLowerCase();
    return historyList.filter(
      (item) =>
        item.trackingCode.toLowerCase().includes(q) ||
        item.merchantName.toLowerCase().includes(q) ||
        item.itemsDescription.toLowerCase().includes(q) ||
        item.destination.toLowerCase().includes(q)
    );
  }, [historyList, search]);

  const handleOpenPod = (item: CustomerDelivery) => {
    setSelectedPod(item);
    setPodOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("historyPageTitle")}
        description={t("historyPageSubtitle")}
      />

      {selectedPod ? (
        <PodModal
          open={podOpen}
          onOpenChange={setPodOpen}
          parcel={{
            trackingCode: selectedPod.trackingCode,
            recipientName: authUser?.name || "Verified Customer",
            recipientPhone: authUser?.phone || "+8801700000005",
            deliveryAddress: selectedPod.destination,
            deliveredAt: selectedPod.deliveredAt || "Completed",
            riderName: selectedPod.riderName || "Dhruto Express Rider",
            merchantName: selectedPod.merchantName,
            codAmount: selectedPod.codAmount,
            description: selectedPod.itemsDescription,
          }}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filteredHistory.length}</span> completed doorstep deliveries
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search completed shipments..."
            className="h-9 w-full rounded-xl border border-border/80 bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
          No completed shipment records match your search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {filteredHistory.map((item) => (
            <Card
              key={item.id}
              className="border border-border/80 bg-surface shadow-2xs transition-all hover:border-primary/40 hover:shadow-soft"
            >
              <CardContent className="p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-soft text-success">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <span className="font-mono text-xs font-bold text-foreground block">
                        {item.trackingCode}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.merchantName}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-[10px] font-bold text-success-soft-foreground">
                    Delivered
                  </span>
                </div>

                <div className="rounded-xl bg-surface-muted/50 p-2.5 text-xs">
                  <p className="font-medium text-foreground">{item.itemsDescription}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {item.destination}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{item.deliveredAt || "Completed"}</span>
                  </div>

                  <div className="font-semibold text-foreground">
                    COD: {item.codAmount > 0 ? `৳${item.codAmount}` : "Prepaid"}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPod(item)}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    POD Receipt
                  </Button>
                  <Link href={`${CUSTOMER_ROUTES.tracking}/${item.trackingCode}`}>
                    <Button variant="secondary" size="sm" className="h-8 gap-1 text-xs font-semibold">
                      Timeline
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
