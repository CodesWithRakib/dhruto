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
  Truck,
  Plus,
  Send,
  AlertCircle,
  FileText,
  User,
  Phone,
  Car,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  useGetManifestsQuery,
  useCreateManifestMutation,
  useDispatchManifestMutation,
  useGetBagsQuery,
  type HubItem,
} from "../api/hubs.api";
import { toast } from "sonner";

interface ManifestManagerProps {
  currentHubId: string;
  allHubs: HubItem[];
}

export function ManifestManager({ currentHubId, allHubs }: ManifestManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [destHubId, setDestHubId] = useState(
    allHubs.find((h) => h.id !== currentHubId)?.id || allHubs[0]?.id || "",
  );
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);
  const [viewingManifest, setViewingManifest] = useState<any | null>(null);

  const { data: manifestsData, isLoading: isLoadingManifests, refetch: refetchManifests } =
    useGetManifestsQuery({ hubId: currentHubId });
  const { data: bagsData, refetch: refetchBags } = useGetBagsQuery({ hubId: currentHubId });

  const [createManifestMutation, { isLoading: isCreatingManifest }] = useCreateManifestMutation();
  const [dispatchManifestMutation, { isLoading: isDispatching }] = useDispatchManifestMutation();

  const manifests = manifestsData?.data || [];
  const bags = bagsData?.data || [];

  // Filter bags that are SEALED and destined for the currently selected destination hub
  const availableBags = bags.filter((b: any) => {
    return b.status === "SEALED";
  });

  const toggleBagSelection = (bagId: string) => {
    setSelectedBagIds((prev) =>
      prev.includes(bagId) ? prev.filter((id) => id !== bagId) : [...prev, bagId],
    );
  };

  const handleCreateManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destHubId) {
      toast.error("Please select a destination hub");
      return;
    }
    if (!vehicleNumber.trim()) {
      toast.error("Please enter a vehicle registration number");
      return;
    }
    if (selectedBagIds.length === 0) {
      toast.error("Please select at least one sealed transit bag");
      return;
    }

    try {
      const res = await createManifestMutation({
        originHubId: currentHubId,
        manifest: {
          destinationHubId: destHubId,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          driverName: driverName.trim() || undefined,
          driverPhone: driverPhone.trim() || undefined,
          bagIds: selectedBagIds,
        },
      }).unwrap();

      if (res.success) {
        toast.success(`Manifest created: ${res.data.manifestCode}`);
        setIsCreating(false);
        setVehicleNumber("");
        setDriverName("");
        setDriverPhone("");
        setSelectedBagIds([]);
        refetchManifests();
        refetchBags();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create manifest");
    }
  };

  const handleDispatch = async (manifestId: string) => {
    try {
      const res = await dispatchManifestMutation(manifestId).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetchManifests();
        refetchBags();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to dispatch manifest");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CREATED":
        return <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">Ready to Depart</Badge>;
      case "DISPATCHED":
        return <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50">In Transit</Badge>;
      case "RECEIVED":
        return <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50">Arrived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Vehicle Line-Haul Manifests
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Group sealed security bags, assign transport vehicles, and track inter-hub highway transit
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2"
        >
          {isCreating ? (
            "Cancel"
          ) : (
            <>
              <Plus className="h-4 w-4" /> Create Vehicle Manifest
            </>
          )}
        </Button>
      </div>

      {/* Manifest Creation Form Card */}
      {isCreating && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              New Line-Haul Transport Manifest
            </CardTitle>
            <CardDescription>
              Enclose sealed security bags into a vehicle run. Once dispatched, all enclosed bags and parcels move to IN_TRANSIT.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateManifest} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Destination Hub <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={destHubId}
                    onChange={(e) => setDestHubId(e.target.value)}
                    className="w-full border rounded-md p-2 bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                    required
                  >
                    {allHubs
                      .filter((h) => h.id !== currentHubId)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    Vehicle Registration Number <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. DM-TA-11-2049"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Driver Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Rafiqul Islam"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Driver Contact Phone (Optional)
                  </label>
                  <Input
                    placeholder="e.g. +8801712345678"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Sealed Bags Multi-Selection */}
              <div className="pt-2 border-t">
                <label className="text-sm font-semibold mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Select Sealed Bags to Load ({selectedBagIds.length} selected)
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Only SEALED bags are eligible for manifest loading
                  </span>
                </label>

                {availableBags.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted/40 border text-center text-sm text-muted-foreground">
                    <AlertCircle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    No sealed bags found at this hub. Seal open transit bags in the Bag Consolidation Station first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-2 border rounded-lg bg-muted/20">
                    {availableBags.map((bag: any) => {
                      const isSelected = selectedBagIds.includes(bag.id);
                      return (
                        <div
                          key={bag.id}
                          onClick={() => toggleBagSelection(bag.id)}
                          className={`cursor-pointer p-3 rounded-lg border text-sm transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-card hover:bg-accent/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-muted-foreground"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs font-mono truncate">{bag.bagCode}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              To: <span className="font-medium text-foreground">{bag.destinationHub}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                              <span>{bag.parcelCount} parcels</span>
                              {bag.sealTag && <span>• Seal #{bag.sealTag}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingManifest || selectedBagIds.length === 0}
                  className="flex items-center gap-2"
                >
                  {isCreatingManifest ? "Generating..." : "Generate & Enclose Manifest"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Manifests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispatched & Active Manifests</CardTitle>
          <CardDescription>
            Inter-hub vehicle line-haul dispatches originating or arriving at this terminal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingManifests ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading manifests...
            </div>
          ) : manifests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Truck className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              No vehicle manifests recorded yet. Create a manifest to initiate line-haul transit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 text-left">Manifest Code</th>
                    <th className="py-3 px-4 text-left">Route</th>
                    <th className="py-3 px-4 text-left">Vehicle & Driver</th>
                    <th className="py-3 px-4 text-center">Bags</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-left">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {manifests.map((man: any) => (
                    <tr key={man.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-xs">
                        {man.manifestCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-medium">{man.originHub}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-primary">{man.destinationHub}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold">{man.vehicleNumber}</div>
                        {man.driverName && (
                          <div className="text-muted-foreground text-[11px]">
                            {man.driverName} {man.driverPhone && `(${man.driverPhone})`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary" className="font-mono">
                          {man.bagCount} bags
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(man.status)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(man.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {man.status === "CREATED" && (
                            <Button
                              size="sm"
                              onClick={() => handleDispatch(man.id)}
                              disabled={isDispatching}
                              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Dispatch Run
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingManifest(man)}
                            className="h-8 gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manifest Detail Modal */}
      {viewingManifest && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-primary/20">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Manifest Summary Sheet
                  </CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {viewingManifest.manifestCode}
                  </CardDescription>
                </div>
                {getStatusBadge(viewingManifest.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground block text-[11px]">Origin Hub</span>
                  <span className="font-semibold text-sm">{viewingManifest.originHub}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground block text-[11px]">Destination Hub</span>
                  <span className="font-semibold text-sm">{viewingManifest.destinationHub}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground block text-[11px]">Transport Vehicle</span>
                  <span className="font-semibold text-sm">{viewingManifest.vehicleNumber}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground block text-[11px]">Driver</span>
                  <span className="font-semibold text-sm">
                    {viewingManifest.driverName || "Unassigned"}{" "}
                    {viewingManifest.driverPhone && `(${viewingManifest.driverPhone})`}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Total Enclosed Transit Bags</span>
                <span className="font-bold text-sm text-primary font-mono">{viewingManifest.bagCount} Bags</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setViewingManifest(null)}>
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    window.print();
                  }}
                  className="gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  Print Manifest Sheet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
