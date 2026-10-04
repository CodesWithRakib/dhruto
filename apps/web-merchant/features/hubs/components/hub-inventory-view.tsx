"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
} from "@dhruto/ui";
import {
  Package,
  Layers,
  Truck,
  CheckCircle2,
  Search,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useGetHubInventoryQuery } from "../api/hubs.api";
import Link from "next/link";
import { toast } from "sonner";

interface HubInventoryViewProps {
  currentHubId: string;
}

export function HubInventoryView({ currentHubId }: HubInventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data, isLoading, refetch } = useGetHubInventoryQuery(currentHubId);
  const inventory = data?.data;

  const counts = inventory?.counts || {
    inboundCount: 0,
    receivedCount: 0,
    baggedCount: 0,
    outForDeliveryCount: 0,
    openBagsCount: 0,
  };

  const parcels = inventory?.parcels || [];

  const filteredParcels = parcels.filter((p) => {
    const matchesSearch =
      searchTerm === "" ||
      p.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.recipientPhone.includes(searchTerm);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "RECEIVED" && p.status === "ORIGIN_HUB_RECEIVED") ||
      (statusFilter === "BAGGED" && p.status === "BAGGED") ||
      (statusFilter === "IN_TRANSIT" && p.status === "IN_TRANSIT") ||
      (statusFilter === "DESTINATION" && p.status === "DESTINATION_HUB_RECEIVED");

    return matchesSearch && matchesStatus;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${text} to clipboard`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ORIGIN_HUB_RECEIVED":
        return <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50">At Hub (Sorted)</Badge>;
      case "BAGGED":
        return <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50">In Transit Bag</Badge>;
      case "IN_TRANSIT":
        return <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">Line-Haul Transit</Badge>;
      case "DESTINATION_HUB_RECEIVED":
        return <Badge variant="outline" className="border-purple-400 text-purple-600 bg-purple-50">Arrived at Dest Hub</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Received at Hub
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {counts.receivedCount}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ready for sorting & bagging</p>
            </div>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Consolidated in Bags
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {counts.baggedCount}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Inside security transit bags</p>
            </div>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Open Active Bags
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {counts.openBagsCount}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Accepting parcel packing</p>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-lg">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Terminal Throughput
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {parcels.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total processed items</p>
            </div>
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-lg">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parcels Table & Filters */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Terminal Inventory & Parcels</CardTitle>
              <CardDescription>
                Live list of parcels currently present or processed through this hub facility
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tracking code, recipient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <Button
                size="sm"
                variant={statusFilter === "ALL" ? "default" : "outline"}
                onClick={() => setStatusFilter("ALL")}
                className="h-8 text-xs"
              >
                All ({parcels.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "RECEIVED" ? "default" : "outline"}
                onClick={() => setStatusFilter("RECEIVED")}
                className="h-8 text-xs"
              >
                Received ({counts.receivedCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "BAGGED" ? "default" : "outline"}
                onClick={() => setStatusFilter("BAGGED")}
                className="h-8 text-xs"
              >
                Bagged ({counts.baggedCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "DESTINATION" ? "default" : "outline"}
                onClick={() => setStatusFilter("DESTINATION")}
                className="h-8 text-xs"
              >
                At Dest Hub
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading hub inventory...
            </div>
          ) : filteredParcels.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              No parcels matching the selected filters found at this hub.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 text-left">Tracking Code</th>
                    <th className="py-3 px-4 text-left">Recipient</th>
                    <th className="py-3 px-4 text-left">Destination</th>
                    <th className="py-3 px-4 text-right">COD Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-left">Last Activity</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredParcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{parcel.trackingCode}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(parcel.trackingCode)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                            title="Copy Code"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold">{parcel.recipientName}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {parcel.recipientPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {parcel.district || "Default District"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-xs">
                        ৳{Number(parcel.codAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(parcel.status)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(parcel.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/track/${parcel.trackingCode}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Track
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
