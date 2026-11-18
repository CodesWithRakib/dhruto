"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, DataTable } from "@dhruto/ui";
import { Package, Plus } from "lucide-react";
import { BagStatus } from "@dhruto/contracts";
import {
  useGetBagsQuery,
  useCreateBagMutation,
  useSealBagMutation,
  useGetDestinationHubsQuery,
} from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { BagCreateCard } from "./bags/bag-create-card";
import { BagSealDialog } from "./bags/bag-seal-dialog";
import { getBagColumns } from "./bags/bag-table-columns";
import { BagStatusFilterStrip } from "./bags/bag-status-filter-strip";
import { BagMobileList } from "./bags/bag-mobile-list";

interface BagManagerProps {
  currentHubId: string;
}

/**
 * Bag list + creation.
 *
 * Bags move between hubs only inside a manifest: dispatch and receive happen
 * on the manifest details surface, never on a bare bag.
 */
export function BagManager({ currentHubId }: BagManagerProps) {
  const t = useTranslations("Hub");
  const [isCreating, setIsCreating] = React.useState(false);
  const [destHubId, setDestHubId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [sealTagInput, setSealTagInput] = React.useState("");
  const [sealingBagId, setSealingBagId] = React.useState<string | null>(null);
  const [confirmSealOpen, setConfirmSealOpen] = React.useState(false);

  const { data, isLoading, refetch } = useGetBagsQuery({ hubId: currentHubId });
  const { data: destinationsData } = useGetDestinationHubsQuery();
  const [createBagMutation, { isLoading: isCreatingBag }] = useCreateBagMutation();
  const [sealBagMutation, { isLoading: isSealing }] = useSealBagMutation();

  const bags = data?.data ?? [];
  const destinations = (destinationsData?.data ?? []).filter((hub) => hub.id !== currentHubId);

  React.useEffect(() => {
    if (!destHubId && destinations.length > 0) {
      setDestHubId(destinations[0]?.id ?? "");
    }
  }, [destinations, destHubId]);

  const handleCreateBag = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destHubId) {
      toast.error(t("bags.destinationRequired"));
      return;
    }

    try {
      const res = await createBagMutation({
        hubId: currentHubId,
        bag: { destinationHubId: destHubId, notes: notes.trim() || undefined },
      }).unwrap();

      if (res.success) {
        toast.success(res.data?.bagCode ?? "");
        setIsCreating(false);
        setNotes("");
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("bags.empty")));
    }
  };

  const openSealConfirm = (bagId: string) => {
    setSealingBagId(bagId);
    setSealTagInput("");
    setConfirmSealOpen(true);
  };

  const handleSeal = async () => {
    if (!sealingBagId) return;
    const tag = sealTagInput.trim();
    if (tag.length < 2) {
      toast.error(t("bags.sealTagPlaceholder"));
      return;
    }
    try {
      const res = await sealBagMutation({ bagId: sealingBagId, seal: { sealTag: tag } }).unwrap();
      if (res.success) {
        toast.success(res.message);
        setConfirmSealOpen(false);
        setSealingBagId(null);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("bags.seal")));
    }
  };

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | BagStatus>("ALL");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const statusCounts = React.useMemo(() => {
    let open = 0;
    let sealed = 0;
    let inTransit = 0;
    let received = 0;
    for (const b of bags) {
      if (b.status === BagStatus.OPEN) open++;
      else if (b.status === BagStatus.SEALED) sealed++;
      else if (b.status === BagStatus.IN_TRANSIT) inTransit++;
      else if (b.status === BagStatus.RECEIVED) received++;
    }
    return {
      ALL: bags.length,
      [BagStatus.OPEN]: open,
      [BagStatus.SEALED]: sealed,
      [BagStatus.IN_TRANSIT]: inTransit,
      [BagStatus.RECEIVED]: received,
    };
  }, [bags]);

  const filteredBags = React.useMemo(() => {
    return bags.filter((bag) => {
      if (statusFilter !== "ALL" && bag.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        bag.bagCode.toLowerCase().includes(q) ||
        (bag.sealTag?.toLowerCase().includes(q) ?? false) ||
        bag.destinationHubName.toLowerCase().includes(q)
      );
    });
  }, [bags, statusFilter, search]);

  const pagedBags = React.useMemo(() => {
    const start = (page - 1) * limit;
    return filteredBags.slice(start, start + limit);
  }, [filteredBags, page, limit]);

  const columns = React.useMemo(
    () =>
      getBagColumns({
        onOpenSeal: openSealConfirm,
        statusHeader: t("status"),
        parcelsHeader: t("bags.parcelsInBag"),
        actionsHeader: t("actions"),
        destinationHeader: t("bags.destination"),
        sealText: t("bags.seal"),
        detailsText: t("bags.details"),
      }),
    [t]
  );

  return (
    <div className="space-y-6">
      {isCreating ? (
        <BagCreateCard
          destinations={destinations}
          destHubId={destHubId}
          setDestHubId={setDestHubId}
          notes={notes}
          setNotes={setNotes}
          onSubmit={handleCreateBag}
          onCancel={() => setIsCreating(false)}
          isCreating={isCreatingBag}
        />
      ) : null}

      <div className="relative rounded-3xl bg-card/90 backdrop-blur-md overflow-hidden">

        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground sm:text-base">
                  {t("bags.title")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("bags.activeBagsCount", { count: bags.length })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreating((value) => !value)}
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {isCreating ? t("cancel") : t("bags.create")}
            </Button>
          </div>

          <BagStatusFilterStrip
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusCounts={statusCounts}
            onFilterChange={() => setPage(1)}
          />
        </div>

        <div>
          {isLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : filteredBags.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Package}
                title={t("bags.empty")}
                description={t("bags.emptyDescription")}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={pagedBags}
                  totalItems={filteredBags.length}
                  pageCount={Math.max(1, Math.ceil(filteredBags.length / limit))}
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
                  searchPlaceholder={t("bags.searchPlaceholder")}
                  emptyMessage={t("bags.empty")}
                  className="rounded-none"
                />
              </div>
              <BagMobileList bags={pagedBags} onOpenSeal={openSealConfirm} />
            </>
          )}
        </div>
      </div>

      <BagSealDialog
        open={confirmSealOpen}
        onOpenChange={setConfirmSealOpen}
        sealTagInput={sealTagInput}
        setSealTagInput={setSealTagInput}
        onConfirm={handleSeal}
        isSealing={isSealing}
      />
    </div>
  );
}
