"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  ColumnDef,
} from "@dhruto/ui";
import { Truck, Plus, Send, AlertCircle, FileText, ArrowRight } from "lucide-react";
import { BagStatus, ManifestStatus, type ManifestListItem } from "@dhruto/contracts";
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

  const columns: ColumnDef<ManifestListItem>[] = React.useMemo(() => [
    {
      accessorKey: "manifestCode",
      header: "Manifest",
      cell: ({ row }) => (
        <Link
          href={HUB_ROUTES.manifest(row.original.id)}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.original.manifestCode}
        </Link>
      ),
    },
    {
      id: "route",
      header: "Route",
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-medium">{row.original.originHubName}</span>
          <ArrowRight
            className="mx-1 inline h-3 w-3 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium text-primary">
            {row.original.destinationHubName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "vehicleNumber",
      header: t("manifests.vehicle"),
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.vehicleNumber}</span>,
    },
    {
      accessorKey: "bagCount",
      header: () => <div className="text-center">{t("bags.title")}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold tabular-nums">
            {row.original.bagCount}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="ManifestStatus"
            value={row.original.status}
            tones={MANIFEST_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("actions")}</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {row.original.status === ManifestStatus.CREATED ? (
            <Button
              size="sm"
              onClick={() => handleDispatch(row.original.id)}
              disabled={isDispatching}
              className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {t("manifests.dispatch")}
            </Button>
          ) : null}
          <Link href={HUB_ROUTES.manifest(row.original.id)}>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-xl text-xs bg-surface-muted/60 font-semibold hover:bg-surface-muted">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {t("manifests.details")}
            </Button>
          </Link>
        </div>
      ),
    },
  ], [t, isDispatching]);

  return (
    <div className="space-y-6">
      {isCreating ? (
        <div className="rounded-3xl bg-primary/5 p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("manifests.create")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("manifests.subtitle")}</p>
          </div>
          <div>
            <form onSubmit={handleCreateManifest} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="manifest-destination" className="block text-xs font-semibold text-muted-foreground">
                    {t("manifests.destination")} <span className="text-danger">*</span>
                  </label>
                  <Select
                    value={destHubId}
                    onValueChange={(value) => {
                      setDestHubId(value);
                      setSelectedBagIds([]);
                    }}
                    required
                  >
                    <SelectTrigger id="manifest-destination" className="w-full rounded-2xl border-0 bg-surface-muted/60 focus:bg-background">
                      <SelectValue placeholder={t("manifests.destination")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-0 bg-surface-elevated shadow-xl">
                      {destinations.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.name} ({hub.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manifest-vehicle" className="block text-xs font-semibold text-muted-foreground">
                    {t("manifests.vehicle")} <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="manifest-vehicle"
                    placeholder={t("manifests.vehiclePlaceholder")}
                    value={vehicleNumber}
                    onChange={(event) => setVehicleNumber(event.target.value)}
                    required
                    className="rounded-2xl border-0 bg-surface-muted/60 font-mono uppercase focus:bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manifest-driver" className="block text-xs font-semibold text-muted-foreground">
                    {t("manifests.driverName")}
                  </label>
                  <Input
                    id="manifest-driver"
                    value={driverName}
                    onChange={(event) => setDriverName(event.target.value)}
                    className="rounded-2xl border-0 bg-surface-muted/60 focus:bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manifest-driver-phone" className="block text-xs font-semibold text-muted-foreground">
                    {t("manifests.driverPhone")}
                  </label>
                  <Input
                    id="manifest-driver-phone"
                    value={driverPhone}
                    onChange={(event) => setDriverPhone(event.target.value)}
                    className="rounded-2xl border-0 bg-surface-muted/60 focus:bg-background"
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="mb-1 text-sm font-semibold text-foreground">
                  {t("manifests.selectBags", { count: selectedBagIds.length })}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("manifests.selectBagsHint")}
                </p>

                {availableBags.length === 0 ? (
                  <div className="rounded-2xl bg-warning/10 p-4 text-center text-xs text-muted-foreground">
                    <AlertCircle className="mx-auto mb-1.5 h-5 w-5 text-warning" aria-hidden="true" />
                    {t("manifests.noSealedBags")}
                  </div>
                ) : (
                  <div className="grid max-h-56 grid-cols-1 gap-2.5 overflow-y-auto rounded-2xl bg-surface-muted/30 p-3 sm:grid-cols-2 md:grid-cols-3">
                    {availableBags.map((bag) => {
                      const isSelected = selectedBagIds.includes(bag.id);
                      return (
                        <div
                          key={bag.id}
                          onClick={() => toggleBagSelection(bag.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleBagSelection(bag.id);
                            }
                          }}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-2xl p-3 text-sm transition-all ${
                            isSelected ? "bg-primary/10 text-primary" : "bg-surface-elevated hover:bg-surface-muted/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            tabIndex={-1}
                            aria-hidden="true"
                            className="mt-0.5 rounded text-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-xs font-bold text-foreground">
                              {bag.bagCode}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {t("bags.parcelCount", { count: bag.parcelCount })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingManifest || selectedBagIds.length === 0}
                  className="gap-2 rounded-xl text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {isCreatingManifest ? t("manifests.creating") : t("manifests.create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl bg-surface-elevated overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground sm:text-base">
                  Active Dispatch Records
                </h3>
                <p className="text-xs text-muted-foreground">
                  {manifests.length} total manifests recorded
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
                    ? "bg-primary text-primary-foreground"
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
                    <div className="flex gap-2">
                      {manifest.status === ManifestStatus.CREATED ? (
                        <Button
                          size="sm"
                          onClick={() => handleDispatch(manifest.id)}
                          disabled={isDispatching}
                          className="h-9 flex-1 rounded-xl"
                        >
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("manifests.dispatch")}
                        </Button>
                      ) : null}
                      <Link href={HUB_ROUTES.manifest(manifest.id)} className="flex-1">
                        <Button size="sm" variant="ghost" className="h-9 w-full rounded-xl bg-surface-muted/60 text-xs font-semibold">
                          {t("manifests.details")}
                        </Button>
                      </Link>
                    </div>
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
