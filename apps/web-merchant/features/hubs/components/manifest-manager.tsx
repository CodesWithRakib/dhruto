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
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { ManifestCreateCard } from "./manifests/manifest-create-card";
import { getManifestColumns } from "./manifests/manifest-table-columns";
import { ManifestStatusFilterStrip } from "./manifests/manifest-status-filter-strip";
import { ManifestMobileList } from "./manifests/manifest-mobile-list";

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

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | ManifestStatus>("ALL");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  // Server-side paging, filtering and counts (the API returns one page only).
  const {
    data: manifestsData,
    isLoading: isLoadingManifests,
    refetch: refetchManifests,
  } = useGetManifestsQuery({
    hubId: currentHubId,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: debouncedSearch,
    page,
    limit,
  });
  const { data: bagsData, refetch: refetchBags } = useGetBagsQuery({
    hubId: currentHubId,
    status: BagStatus.SEALED,
    limit: 100,
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

  const statusCounts = React.useMemo(() => {
    const counts = manifestsData?.meta?.statusCounts ?? {};
    const get = (k: ManifestStatus) => counts[k] ?? 0;
    return {
      ALL: Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0),
      [ManifestStatus.CREATED]: get(ManifestStatus.CREATED),
      [ManifestStatus.DISPATCHED]: get(ManifestStatus.DISPATCHED),
      [ManifestStatus.IN_TRANSIT]: get(ManifestStatus.IN_TRANSIT),
      [ManifestStatus.RECEIVED]: get(ManifestStatus.RECEIVED),
      [ManifestStatus.RECONCILED]: get(ManifestStatus.RECONCILED),
    };
  }, [manifestsData]);

  const filteredManifests = manifests;
  const pagedManifests = manifests;
  const totalItems = manifestsData?.meta?.total ?? manifests.length;

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

      <div className="relative rounded-3xl bg-card/90 backdrop-blur-md overflow-hidden">

        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground sm:text-base">
                  {t("manifests.title")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("manifests.activeCount", { count: manifests.length })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreating((value) => !value)}
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {isCreating ? t("cancel") : t("manifests.create")}
            </Button>
          </div>

          <ManifestStatusFilterStrip
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusCounts={statusCounts}
            onFilterChange={() => setPage(1)}
          />
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
                  totalItems={totalItems}
                  pageCount={Math.max(1, manifestsData?.meta?.totalPages ?? Math.ceil(totalItems / limit))}
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
                  searchPlaceholder={t("manifests.searchPlaceholder")}
                  emptyMessage={t("manifests.empty")}
                  className="rounded-none"
                />
              </div>
              <ManifestMobileList manifests={pagedManifests} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
