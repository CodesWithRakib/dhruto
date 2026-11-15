"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, DataTable } from "@dhruto/ui";
import { Truck, Plus } from "lucide-react";
import { BagStatus, ManifestStatus } from "@dhruto/contracts";
import {
  useGetManifestsQuery,
  useCreateManifestMutation,
  useDispatchManifestMutation,
  useGetBagsQuery,
  useGetDestinationHubsQuery,
} from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { MANIFEST_STATUS_TONE } from "@/config/status";
import { ManifestCreateCard } from "./manifests/manifest-create-card";
import { getManifestColumns } from "./manifests/manifest-table-columns";

interface ManifestManagerProps {
  currentHubId: string;
}

/** Manifest list + creation. Dispatch and receive live on the details page. */
export function ManifestManager({ currentHubId }: ManifestManagerProps) {
  const t = useTranslations("Hub");
  const [isCreating, setIsCreating] = React.useState(false);
  const [destHubId, setDestHubId] = React.useState("");
  const [vehicleNumber, setVehicleNumber] = React.useState("");
  const [driverName, setDriverName] = React.useState("");
  const [driverPhone, setDriverPhone] = React.useState("");
  const [selectedBagIds, setSelectedBagIds] = React.useState<string[]>([]);

  const {
    data: manifestsData,
    isLoading: isLoadingManifests,
    refetch: refetchManifests,
  } = useGetManifestsQuery(currentHubId);
  const { data: bagsData, refetch: refetchBags } = useGetBagsQuery({
    hubId: currentHubId,
    status: BagStatus.SEALED,
  });
  const { data: destinationsData } = useGetDestinationHubsQuery();

  const [createManifestMutation, { isLoading: isCreatingManifest }] = useCreateManifestMutation();
  const [dispatchManifestMutation, { isLoading: isDispatching }] = useDispatchManifestMutation();

  const manifests = manifestsData?.data ?? [];
  const sealedBags = (bagsData?.data ?? []).filter((bag) => bag.destinationHubCode !== "");
  const destinations = (destinationsData?.data ?? []).filter((hub) => hub.id !== currentHubId);

  React.useEffect(() => {
    if (!destHubId && destinations.length > 0) {
      setDestHubId(destinations[0]?.id ?? "");
    }
  }, [destinations, destHubId]);

  const availableBags = sealedBags.filter((bag) =>
    destinations.find((hub) => hub.id === destHubId)
      ? bag.destinationHubCode === destinations.find((hub) => hub.id === destHubId)?.code
      : true,
  );

  const toggleBagSelection = (bagId: string) => {
    setSelectedBagIds((prev) =>
      prev.includes(bagId) ? prev.filter((id) => id !== bagId) : [...prev, bagId],
    );
  };

  const handleCreateManifest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destHubId) {
      toast.error(t("bags.destinationRequired"));
      return;
    }
    if (!vehicleNumber.trim()) {
      toast.error(t("manifests.vehicleRequired"));
      return;
    }
    if (selectedBagIds.length === 0) {
      toast.error(t("manifests.selectAtLeastOne"));
      return;
    }

    try {
      const res = await createManifestMutation({
        hubId: currentHubId,
        manifest: {
          destinationHubId: destHubId,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          driverName: driverName.trim() || undefined,
          driverPhone: driverPhone.trim() || undefined,
          bagIds: selectedBagIds,
        },
      }).unwrap();

      if (res.success) {
        toast.success(res.data?.manifestCode ?? "");
        setIsCreating(false);
        setVehicleNumber("");
        setDriverName("");
        setDriverPhone("");
        setSelectedBagIds([]);
        refetchManifests();
        refetchBags();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("manifests.create")));
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
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("manifests.dispatch")));
    }
  };

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | ManifestStatus>("ALL");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const statusCounts = React.useMemo(() => {
    let created = 0;
    let dispatched = 0;
    let inTransit = 0;
    let received = 0;
    let reconciled = 0;
    for (const m of manifests) {
      if (m.status === ManifestStatus.CREATED) created++;
      else if (m.status === ManifestStatus.DISPATCHED) dispatched++;
      else if (m.status === ManifestStatus.IN_TRANSIT) inTransit++;
      else if (m.status === ManifestStatus.RECEIVED) received++;
      else if (m.status === ManifestStatus.RECONCILED) reconciled++;
    }
    return {
      ALL: manifests.length,
      [ManifestStatus.CREATED]: created,
      [ManifestStatus.DISPATCHED]: dispatched,
      [ManifestStatus.IN_TRANSIT]: inTransit,
      [ManifestStatus.RECEIVED]: received,
      [ManifestStatus.RECONCILED]: reconciled,
    };
  }, [manifests]);

  const filteredManifests = React.useMemo(() => {
    return manifests.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        item.manifestCode.toLowerCase().includes(q) ||
        item.vehicleNumber.toLowerCase().includes(q) ||
        (item.driverName?.toLowerCase().includes(q) ?? false) ||
        item.originHubName.toLowerCase().includes(q) ||
        item.destinationHubName.toLowerCase().includes(q)
      );
    });
  }, [manifests, statusFilter, search]);

  const pagedManifests = React.useMemo(() => {
    const start = (page - 1) * limit;
    return filteredManifests.slice(start, start + limit);
  }, [filteredManifests, page, limit]);

  const columns = React.useMemo(
    () =>
      getManifestColumns({
        onDispatch: handleDispatch,
        isDispatching,
        vehicleHeader: t("manifests.vehicle"),
        bagsHeader: t("bags.title"),
        statusHeader: t("status"),
        actionsHeader: t("actions"),
        dispatchText: t("manifests.dispatch"),
        detailsText: t("manifests.details"),
      }),
    [t, isDispatching]
  );

  return (
    <div className="space-y-6">
      {isCreating ? (
        <ManifestCreateCard
          destinations={destinations}
          destHubId={destHubId}
          setDestHubId={setDestHubId}
          vehicleNumber={vehicleNumber}
          setVehicleNumber={setVehicleNumber}
          driverName={driverName}
          setDriverName={setDriverName}
          driverPhone={driverPhone}
          setDriverPhone={setDriverPhone}
          availableBags={availableBags}
          selectedBagIds={selectedBagIds}
          toggleBagSelection={toggleBagSelection}
          onSubmit={handleCreateManifest}
          onCancel={() => setIsCreating(false)}
          isCreating={isCreatingManifest}
        />
      ) : null}

      <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden shadow-sm">
        {/* Specular top highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-3 p-5 sm:p-6 border-b border-border/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 text-primary shadow-xs">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground sm:text-base">
                  Active Dispatch Records
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {manifests.length} total manifests recorded
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreating((value) => !value)}
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold shrink-0 shadow-xs"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {isCreating ? t("cancel") : t("manifests.create")}
            </Button>
          </div>

          {/* Quick status filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(
              [
                { key: "ALL", label: `All (${statusCounts.ALL})` },
                { key: ManifestStatus.CREATED, label: `Created (${statusCounts[ManifestStatus.CREATED]})` },
                { key: ManifestStatus.DISPATCHED, label: `Dispatched (${statusCounts[ManifestStatus.DISPATCHED]})` },
                { key: ManifestStatus.IN_TRANSIT, label: `In Transit (${statusCounts[ManifestStatus.IN_TRANSIT]})` },
                { key: ManifestStatus.RECEIVED, label: `Received (${statusCounts[ManifestStatus.RECEIVED]})` },
                { key: ManifestStatus.RECONCILED, label: `Reconciled (${statusCounts[ManifestStatus.RECONCILED]})` },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setStatusFilter(item.key);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  statusFilter === item.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {isLoadingManifests ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : filteredManifests.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Truck}
                title={t("manifests.empty")}
                description={t("manifests.emptyDescription")}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={pagedManifests}
                  totalItems={filteredManifests.length}
                  pageCount={Math.max(1, Math.ceil(filteredManifests.length / limit))}
                  currentPage={page}
                  itemsPerPage={limit}
                  onPageChange={setPage}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                  search={search}
                  onSearchChange={(val) => {
                    setSearch(val);
                    setPage(1);
                  }}
                  searchPlaceholder="Search manifest code, vehicle, driver, route..."
                  emptyMessage={t("manifests.empty")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              <ul className="divide-y divide-border/20 md:hidden">
                {pagedManifests.map((manifest) => (
                  <li key={manifest.id} className="space-y-2 p-4 transition-colors hover:bg-surface-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={HUB_ROUTES.manifest(manifest.id)}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {manifest.manifestCode}
                      </Link>
                      <EnumBadge
                        namespace="ManifestStatus"
                        value={manifest.status}
                        tones={MANIFEST_STATUS_TONE}
                        className="text-[10px]"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {manifest.originHubName} → {manifest.destinationHubName} · {manifest.bagCount}{" "}
                      {t("bags.title")}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
