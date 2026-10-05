"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
} from "@dhruto/ui";
import {
  Package,
  Plus,
  Lock,
  Truck,
  CheckCircle2,
} from "lucide-react";
import {
  useGetBagsQuery,
  useCreateBagMutation,
  useSealBagMutation,
  useDispatchBagMutation,
  useReceiveBagMutation,
  type HubItem,
} from "../api/hubs.api";
import { toast } from "sonner";

interface BagManagerProps {
  currentHubId: string;
  allHubs: HubItem[];
}

export function BagManager({ currentHubId, allHubs }: BagManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [destHubId, setDestHubId] = useState(
    allHubs.find((h) => h.id !== currentHubId)?.id || allHubs[0]?.id || "",
  );
  const [sealTagInput, setSealTagInput] = useState("");
  const [sealingBagId, setSealingBagId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetBagsQuery({ hubId: currentHubId });
  const [createBagMutation, { isLoading: isCreatingBag }] = useCreateBagMutation();
  const [sealBagMutation, { isLoading: isSealing }] = useSealBagMutation();
  const [dispatchBagMutation, { isLoading: isDispatching }] = useDispatchBagMutation();
  const [receiveBagMutation, { isLoading: isReceiving }] = useReceiveBagMutation();

  const bags = data?.data || [];

  const handleCreateBag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destHubId) {
      toast.error("Please select a destination hub");
      return;
    }

    try {
      const res = await createBagMutation({
        originHubId: currentHubId,
        bag: { destinationHubId: destHubId },
      }).unwrap();

      if (res.success) {
        toast.success(`Transit bag created: ${res.data.bagCode}`);
        setIsCreating(false);
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create bag");
    }
  };

  const handleSeal = async (bagId: string) => {
    const tag = sealTagInput.trim() || `SEAL-${Date.now().toString().slice(-6)}`;
    try {
      const res = await sealBagMutation({
        bagId,
        seal: { sealTag: tag },
      }).unwrap();

      if (res.success) {
        toast.success(res.message);
        setSealingBagId(null);
        setSealTagInput("");
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to seal bag");
    }
  };

  const handleDispatch = async (bagId: string) => {
    try {
      const res = await dispatchBagMutation(bagId).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to dispatch bag");
    }
  };

  const handleReceive = async (bagId: string) => {
    try {
      const res = await receiveBagMutation({
        bagId,
        destinationHubId: currentHubId,
      }).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to receive bag");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Consolidation & Transit Bags
          </h2>
          <p className="text-xs text-muted-foreground">
            Pack sorted parcels into secured destination bags for vehicle line-haul transfer.
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 text-xs"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? "Cancel" : "Create New Bag"}
        </Button>
      </div>

      {/* New Bag Creation Card */}
      {isCreating && (
        <Card className="border-primary/30 bg-primary/5 p-6 animate-in fade-in">
          <form onSubmit={handleCreateBag} className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">Create Destination Transit Bag</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Target Destination Hub *
                </label>
                <select
                  value={destHubId}
                  onChange={(e) => setDestHubId(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-input bg-background p-2.5 outline-none"
                  required
                >
                  {allHubs
                    .filter((h) => h.id !== currentHubId)
                    .map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name} ({hub.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingBag}>
                {isCreatingBag ? "Creating..." : "Confirm & Open Bag"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Bags Table */}
      <Card className=" border-primary/20">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading transit bags...
            </div>
          ) : bags.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">
                No bags created at this hub yet.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Bag Code</th>
                  <th className="px-4 py-3 font-semibold">Origin Hub</th>
                  <th className="px-4 py-3 font-semibold">Destination Hub</th>
                  <th className="px-4 py-3 font-semibold">Parcels</th>
                  <th className="px-4 py-3 font-semibold">Seal Tag</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bags.map((bag) => (
                  <tr key={bag.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {bag.bagCode}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{bag.originHub}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{bag.destinationHub}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {bag.parcelCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {bag.sealTag || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          bag.status === "RECEIVED"
                            ? "success"
                            : bag.status === "IN_TRANSIT"
                              ? "default"
                              : "outline"
                        }
                        className="text-[10px] font-semibold"
                      >
                        {bag.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {bag.status === "OPEN" && (
                          <>
                            {sealingBagId === bag.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="text"
                                  placeholder="Seal tag"
                                  value={sealTagInput}
                                  onChange={(e) => setSealTagInput(e.target.value)}
                                  className="h-7 w-24 text-[10px] font-mono"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSeal(bag.id)}
                                  disabled={isSealing}
                                  className="h-7 text-[10px] px-2"
                                >
                                  OK
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSealingBagId(bag.id)}
                                className="h-7 text-[10px] flex items-center gap-1"
                              >
                                <Lock className="h-3 w-3" />
                                Seal
                              </Button>
                            )}
                          </>
                        )}

                        {bag.status === "SEALED" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDispatch(bag.id)}
                            disabled={isDispatching}
                            className="h-7 text-[10px] flex items-center gap-1"
                          >
                            <Truck className="h-3 w-3" />
                            Dispatch
                          </Button>
                        )}

                        {bag.status === "IN_TRANSIT" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReceive(bag.id)}
                            disabled={isReceiving}
                            className="h-7 text-[10px] flex items-center gap-1 bg-success hover:bg-success text-primary-foreground"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Receive & Unpack
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
