"use client";

import React, { useState } from "react";
import {
  Card,
  Button,
  Badge,
} from "@dhruto/ui";
import {
  Warehouse,
  Scan,
  Package,
  Truck,
  Layers,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useGetHubsQuery, useGetHubInventoryQuery } from "../api/hubs.api";
import { HubScanner } from "./hub-scanner";
import { BagManager } from "./bag-manager";
import { ManifestManager } from "./manifest-manager";
import { HubInventoryView } from "./hub-inventory-view";

type HubTab = "SCANNER" | "BAGS" | "MANIFEST" | "INVENTORY";

export function HubOperationsView() {
  const { data: hubsData, isLoading: isLoadingHubs, refetch: refetchHubs } = useGetHubsQuery();
  const hubs = hubsData?.data || [];

  const [selectedHubId, setSelectedHubId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<HubTab>("SCANNER");

  // Default to first hub when data arrives
  const currentHubId = selectedHubId || hubs[0]?.id || "";
  const currentHub = hubs.find((h) => h.id === currentHubId) || hubs[0];

  const { data: inventoryData, refetch: refetchInventory } = useGetHubInventoryQuery(
    currentHubId,
    { skip: !currentHubId },
  );

  const inventory = inventoryData?.data;
  const openBags = inventory?.openBags || [];

  const handleRefresh = () => {
    refetchHubs();
    refetchInventory();
  };

  if (isLoadingHubs) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-muted-foreground font-medium">Loading hub network and terminal terminals...</p>
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <Card className="max-w-md mx-auto text-center p-8 mt-12">
        <Warehouse className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="font-semibold text-lg">No Hubs Configured</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Hub terminals have not yet been initialized in the system.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Hub Selector */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="p-3.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <Warehouse className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">Hub Operations Center</h1>
              <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50 text-xs">
                Live Terminal
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <MapPin className="h-3.5 w-3.5" />
              <span>{currentHub?.address || "Bangladesh Logistics Network"}</span>
              <span className="font-mono text-xs text-primary font-semibold">({currentHub?.code})</span>
            </p>
          </div>
        </div>

        {/* Hub Selector & Quick Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <select
              value={currentHub?.id || ""}
              onChange={(e) => setSelectedHubId(e.target.value)}
              className="w-full sm:w-72 font-semibold text-sm border-2 border-primary/20 bg-background rounded-xl px-4 py-2.5 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
            >
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  🏢 {hub.name} ({hub.code})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-10 px-3.5 text-xs flex items-center gap-1.5"
            title="Refresh Terminal Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab("SCANNER")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "SCANNER"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          }`}
        >
          <Scan className="h-4 w-4" />
          Barcode Scanner Terminal
        </button>

        <button
          onClick={() => setActiveTab("BAGS")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "BAGS"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          }`}
        >
          <Layers className="h-4 w-4" />
          Bag Consolidation Station
          {openBags.length > 0 && (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-5">
              {openBags.length} open
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("MANIFEST")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "MANIFEST"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          }`}
        >
          <Truck className="h-4 w-4" />
          Vehicle Line-Haul Manifests
        </button>

        <button
          onClick={() => setActiveTab("INVENTORY")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "INVENTORY"
              ? "border-primary text-primary bg-primary/5 rounded-t-lg"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
          }`}
        >
          <Package className="h-4 w-4" />
          Hub Inventory
          {inventory?.parcels && (
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5">
              {inventory.parcels.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "SCANNER" && currentHub && (
          <HubScanner
            hubId={currentHub.id}
            hubName={currentHub.name}
            openBags={openBags}
            onScanSuccess={() => {
              refetchInventory();
            }}
          />
        )}

        {activeTab === "BAGS" && currentHub && (
          <BagManager currentHubId={currentHub.id} allHubs={hubs} />
        )}

        {activeTab === "MANIFEST" && currentHub && (
          <ManifestManager currentHubId={currentHub.id} allHubs={hubs} />
        )}

        {activeTab === "INVENTORY" && currentHub && (
          <HubInventoryView currentHubId={currentHub.id} />
        )}
      </div>
    </div>
  );
}
