"use client";

import React, { useState, useMemo } from "react";
import {
  RotateCcw,
  RefreshCw,
  Search,
  PackageCheck,
  Truck,
  ArrowRight,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
} from "@dhruto/ui";
import { ParcelStatus } from "@dhruto/contracts";
import { useGetParcelsQuery } from "../api/parcels.api";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { useFormatters } from "@/lib/format";
import { toast } from "sonner";

const RTO_STATUSES = [
  ParcelStatus.RTO_INITIATED,
  ParcelStatus.RETURN_IN_TRANSIT,
  ParcelStatus.RETURNED_TO_MERCHANT,
];

export function ReturnsListView() {
  const { bdt, date, time } = useFormatters();
  const routes = useRouteBase();

  const [activeTab, setActiveTab] = useState<"ALL" | ParcelStatus>("ALL");
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    return {
      limit: 100,
      status: activeTab === "ALL" ? undefined : activeTab,
      search: search.trim() || undefined,
    };
  }, [activeTab, search]);

  const { data, isLoading, isFetching, refetch } = useGetParcelsQuery(queryParams);

  const allParcels = data?.data ?? [];
  const returnParcels = useMemo(() => {
    if (activeTab === "ALL") {
      return allParcels.filter((p) => RTO_STATUSES.includes(p.status as ParcelStatus));
    }
    return allParcels;
  }, [allParcels, activeTab]);

  const stats = useMemo(() => {
    const initiated = allParcels.filter((p) => p.status === ParcelStatus.RTO_INITIATED).length;
    const inTransit = allParcels.filter((p) => p.status === ParcelStatus.RETURN_IN_TRANSIT).length;
    const completed = allParcels.filter((p) => p.status === ParcelStatus.RETURNED_TO_MERCHANT).length;
    const totalCod = allParcels
      .filter((p) => RTO_STATUSES.includes(p.status as ParcelStatus))
      .reduce((sum, p) => sum + (p.codAmount || 0), 0);

    return {
      active: initiated + inTransit,
      initiated,
      inTransit,
      completed,
      totalCod,
    };
  }, [allParcels]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied tracking code ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href={routes.parcels}>
              <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Returns & RTO Operations
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Monitor failed delivery returns, in-transit return legs, and warehouse restocking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href={routes.parcels}>
            <Button variant="outline" size="sm" className="gap-1.5">
              All Shipments
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                In-Return Transit
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {stats.active}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {stats.initiated} initiated · {stats.inTransit} moving
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Returned to Merchant
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success">
                <PackageCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {stats.completed}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Restocked at origin warehouse
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Returns
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <RotateCcw className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {stats.active + stats.completed}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Cumulative RTO cases
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/80 bg-surface shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recoverable Value
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {bdt(stats.totalCod)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Product value returned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Lens Toolbar */}
      <Card className="rounded-xl border border-border/80 bg-surface shadow-xs">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status Lens Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: "All Returns" },
                { id: ParcelStatus.RTO_INITIATED, label: "Initiated" },
                { id: ParcelStatus.RETURN_IN_TRANSIT, label: "In Return Transit" },
                { id: ParcelStatus.RETURNED_TO_MERCHANT, label: "Restocked / Received" },
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as "ALL" | ParcelStatus)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, phone, recipient..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">
          {isLoading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-muted/60" />
              ))}
            </div>
          ) : returnParcels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <PackageCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                No returned shipments found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {search
                  ? "No returns match your search filter."
                  : "Great news! You have no parcels in return-to-origin status for this view."}
              </p>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="mt-4 text-xs"
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {returnParcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <RotateCcw className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={routes.parcel(parcel.id)}
                          className="font-mono text-xs font-semibold text-foreground hover:underline hover:text-primary"
                        >
                          {parcel.trackingCode}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCopy(parcel.trackingCode)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy code"
                        >
                          {copiedCode === parcel.trackingCode ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <StatusBadge status={parcel.status as ParcelStatus} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{parcel.recipientName}</span>
                        <span>·</span>
                        <span>{parcel.recipientPhone}</span>
                        <span>·</span>
                        <span>{parcel.district}</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Booked: {date(parcel.createdAt)} at {time(parcel.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">
                        {bdt(parcel.codAmount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Fee: {bdt(parcel.deliveryFee)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href={routes.parcel(parcel.id)}>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                          Details
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
