"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileCheck, Search, Calendar } from "lucide-react";
import { Button, Card, CardContent } from "@dhruto/ui";
import { PageHeader } from "@/components/page-header";
import { PodModal } from "./pod-modal";

interface HistoryItem {
  id: string;
  trackingCode: string;
  merchantName: string;
  destination: string;
  deliveredAt: string;
  riderName: string;
  codAmount: number;
  description: string;
  status: "DELIVERED" | "RETURNED";
}

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: "hist-1",
    trackingCode: "DHR-2610-00101",
    merchantName: "Shajgoj Beauty Hub",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    deliveredAt: "Oct 11, 2026 at 03:15 PM",
    riderName: "Rakibul Islam",
    codAmount: 920,
    description: "Skincare Essentials Pack (0.8 kg)",
    status: "DELIVERED",
  },
  {
    id: "hist-2",
    trackingCode: "DHR-2609-00892",
    merchantName: "Daraz Mall Official",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    deliveredAt: "Sep 28, 2026 at 11:40 AM",
    riderName: "Kamrul Hasan",
    codAmount: 2450,
    description: "Wireless Earbuds with ANC Case",
    status: "DELIVERED",
  },
  {
    id: "hist-3",
    trackingCode: "DHR-2609-00755",
    merchantName: "Chaldal Grocery Express",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    deliveredAt: "Sep 15, 2026 at 06:10 PM",
    riderName: "Sohanur Rahman",
    codAmount: 1100,
    description: "Kitchen Essentials & Spices Box",
    status: "DELIVERED",
  },
  {
    id: "hist-4",
    trackingCode: "DHR-2608-00412",
    merchantName: "Yellow Lifestyle Brand",
    destination: "House 42, Road 11, Block D, Banani, Dhaka",
    deliveredAt: "Aug 22, 2026 at 01:25 PM",
    riderName: "Rakibul Islam",
    codAmount: 3200,
    description: "Cotton Polo Shirts (Pack of 3)",
    status: "DELIVERED",
  },
];

export function CustomerHistoryView() {
  const t = useTranslations("Customer");

  const [search, setSearch] = React.useState("");
  const [selectedPod, setSelectedPod] = React.useState<HistoryItem | null>(null);
  const [podOpen, setPodOpen] = React.useState(false);

  const filteredHistory = MOCK_HISTORY.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.trackingCode.toLowerCase().includes(q) ||
      item.merchantName.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  const handleOpenPod = (item: HistoryItem) => {
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
            recipientName: "Customer",
            recipientPhone: "+8801700000000",
            deliveryAddress: selectedPod.destination,
            deliveredAt: selectedPod.deliveredAt,
            riderName: selectedPod.riderName,
            merchantName: selectedPod.merchantName,
            codAmount: selectedPod.codAmount,
            description: selectedPod.description,
          }}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground font-semibold">
          Showing <strong className="text-foreground">{filteredHistory.length}</strong> completed shipments
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search past deliveries..."
            className="h-9 w-full rounded-xl border border-border/80 bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredHistory.map((item) => (
          <Card key={item.id} className="border border-border/80 bg-surface shadow-2xs hover:shadow-soft transition-all">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success border border-success/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-foreground">
                      {item.trackingCode}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-bold text-foreground">
                      {item.merchantName}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-[10px] font-bold text-success-soft-foreground">
                      Delivered
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {item.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.deliveredAt}
                    </span>
                    <span>•</span>
                    <span>
                      Rider: <strong className="text-foreground">{item.riderName}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Paid: <strong className="text-foreground">৳{item.codAmount.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPod(item)}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  View POD
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
