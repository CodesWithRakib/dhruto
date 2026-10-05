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
  DataTable,
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
import { Link } from "@/lib/navigation";
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
        return <Badge variant="outline" className="border-success text-success bg-success-soft">At Hub (Sorted)</Badge>;
      case "BAGGED":
        return <Badge variant="outline" className="border-info text-info bg-info-soft">In Transit Bag</Badge>;
      case "IN_TRANSIT":
        return <Badge variant="outline" className="border-warning text-warning bg-warning-soft">Line-Haul Transit</Badge>;
      case "DESTINATION_HUB_RECEIVED":
        return <Badge variant="outline" className="border-primary text-primary bg-primary-soft">Arrived at Dest Hub</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 ">
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
            <div className="p-2.5 bg-success-soft  text-success rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 ">
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
            <div className="p-2.5 bg-info-soft  text-info rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 ">
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
            <div className="p-2.5 bg-warning-soft  text-warning rounded-lg">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 ">
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
            <div className="p-2.5 bg-primary-soft  text-primary rounded-lg">
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
              <DataTable
                columns={[
                  {
                    accessorKey: "trackingCode",
                    header: "Tracking Code",
                    cell: ({ row }) => (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-xs">{row.original.trackingCode}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.original.trackingCode)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                          title="Copy Code"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    ),
                  },
                  {
                    id: "recipient",
                    header: "Recipient",
                    cell: ({ row }) => (
                      <div className="text-xs">
                        <div className="font-semibold">{row.original.recipientName}</div>
                        <div className="text-muted-foreground text-[11px]">{row.original.recipientPhone}</div>
                      </div>
                    ),
                  },
                  {
                    accessorKey: "district",
                    header: "Destination",
                    cell: ({ row }) => (
                      <div className="text-xs font-medium">{row.original.district || "Default District"}</div>
                    ),
                  },
                  {
                    accessorKey: "codAmount",
                    header: () => <span className="text-right block">COD Amount</span>,
                    cell: ({ row }) => (
                      <div className="text-right font-mono font-medium text-xs">
                        ৳{Number(row.original.codAmount || 0).toLocaleString()}
                      </div>
                    ),
                  },
                  {
                    accessorKey: "status",
                    header: () => <span className="text-center block">Status</span>,
                    cell: ({ row }) => (
                      <div className="text-center">
                        {getStatusBadge(row.original.status)}
                      </div>
                    ),
                  },
                  {
                    accessorKey: "updatedAt",
                    header: "Last Activity",
                    cell: ({ row }) => (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.original.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ),
                  },
                  {
                    id: "actions",
                    header: () => <span className="text-right block">Action</span>,
                    cell: ({ row }) => (
                      <div className="text-right">
                        <Link
                          href={`/track/${row.original.trackingCode}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Track
                        </Link>
                      </div>
                    ),
                  },
                ]}
                data={filteredParcels}
                isLoading={isLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
