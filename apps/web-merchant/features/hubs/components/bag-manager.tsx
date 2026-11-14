"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  ColumnDef,
} from "@dhruto/ui";
import { Package, Plus, Lock } from "lucide-react";
import { BagStatus, type BagListItem } from "@dhruto/contracts";
import {
  useGetBagsQuery,
  useCreateBagMutation,
  useSealBagMutation,
  useGetDestinationHubsQuery,
} from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { BAG_STATUS_TONE } from "@/config/status";

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

  const columns: ColumnDef<BagListItem>[] = React.useMemo(() => [
    {
      accessorKey: "bagCode",
      header: "Bag",
      cell: ({ row }) => (
        <div>
          <Link
            href={HUB_ROUTES.bag(row.original.id)}
            className="font-mono font-bold text-primary hover:underline"
          >
            {row.original.bagCode}
          </Link>
          {row.original.sealTag ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              {row.original.sealTag}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "destinationHubName",
      header: t("bags.destination"),
      cell: ({ row }) => <span className="text-xs font-medium">{row.original.destinationHubName}</span>,
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge
            namespace="BagStatus"
            value={row.original.status}
            tones={BAG_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
      ),
    },
    {
      accessorKey: "parcelCount",
      header: () => <div className="text-center">{t("bags.parcelsInBag")}</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold tabular-nums">
            {row.original.parcelCount}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("actions")}</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.original.status === BagStatus.OPEN ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openSealConfirm(row.original.id)}
              className="h-8 gap-1 rounded-xl bg-surface-muted/60 text-xs font-medium hover:bg-surface-muted"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("bags.seal")}
            </Button>
          ) : null}
          <Link href={HUB_ROUTES.bag(row.original.id)}>
            <Button size="sm" variant="ghost" className="h-8 rounded-xl bg-surface-muted/60 text-xs font-medium hover:bg-surface-muted">
              {t("bags.details")}
            </Button>
          </Link>
        </div>
      ),
    },
  ], [t]);

  return (
    <div className="space-y-6">
      {isCreating ? (
        <div className="rounded-3xl bg-primary/5 p-5 sm:p-6">
          <form onSubmit={handleCreateBag} className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">{t("bags.create")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="bag-destination"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("bags.destination")} *
                </label>
                <Select
                  value={destHubId}
                  onValueChange={setDestHubId}
                  required
                >
                  <SelectTrigger id="bag-destination" className="w-full rounded-2xl border-0 bg-surface-muted/60 focus:bg-background">
                    <SelectValue placeholder={t("bags.destination")} />
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
                <label htmlFor="bag-notes" className="text-xs font-semibold text-muted-foreground">
                  {t("bags.notes")}
                </label>
                <input
                  id="bag-notes"
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t("bags.notesPlaceholder")}
                  maxLength={500}
                  className="w-full rounded-2xl border-0 bg-surface-muted/60 p-3 text-xs outline-none focus:bg-background"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                {t("cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingBag} className="gap-1.5 rounded-xl text-xs font-semibold">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {isCreatingBag ? t("bags.creating") : t("bags.confirmCreate")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-3xl bg-surface-elevated overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground sm:text-base">
                  Active Transit Bags
                </h3>
                <p className="text-xs text-muted-foreground">
                  {bags.length} total bags tracked at this hub
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

          {/* Quick status filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(
              [
                { key: "ALL", label: `All (${statusCounts.ALL})` },
                { key: BagStatus.OPEN, label: `Open (${statusCounts[BagStatus.OPEN]})` },
                { key: BagStatus.SEALED, label: `Sealed (${statusCounts[BagStatus.SEALED]})` },
                { key: BagStatus.IN_TRANSIT, label: `In Transit (${statusCounts[BagStatus.IN_TRANSIT]})` },
                { key: BagStatus.RECEIVED, label: `Received (${statusCounts[BagStatus.RECEIVED]})` },
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
                  searchPlaceholder="Search bag code, seal tag, destination..."
                  emptyMessage={t("bags.empty")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              {/* Mobile cards */}
              <ul className="divide-y divide-border/20 md:hidden">
                {pagedBags.map((bag) => (
                  <li key={bag.id} className="space-y-2 p-4 transition-colors hover:bg-surface-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={HUB_ROUTES.bag(bag.id)}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {bag.bagCode}
                      </Link>
                      <EnumBadge
                        namespace="BagStatus"
                        value={bag.status}
                        tones={BAG_STATUS_TONE}
                        className="text-[10px]"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bag.destinationHubName} · {t("bags.parcelCount", { count: bag.parcelCount })}
                    </p>
                    {bag.status === BagStatus.OPEN ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openSealConfirm(bag.id)}
                        className="h-9 w-full rounded-xl bg-surface-muted/60"
                      >
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("bags.seal")}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Seal confirmation — sealing freezes membership irreversibly */}
      <Dialog open={confirmSealOpen} onOpenChange={setConfirmSealOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0 bg-surface-elevated p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{t("bags.sealConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{t("bags.sealConfirmMessage")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <label htmlFor="seal-tag" className="text-xs font-semibold text-muted-foreground">
              {t("bags.sealTag")} *
            </label>
            <input
              id="seal-tag"
              type="text"
              value={sealTagInput}
              onChange={(event) => setSealTagInput(event.target.value)}
              placeholder={t("bags.sealTagPlaceholder")}
              maxLength={100}
              className="w-full rounded-2xl border-0 bg-surface-muted/60 p-3.5 font-mono text-sm uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-xs placeholder:text-muted-foreground outline-none focus:bg-background"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmSealOpen(false)} className="rounded-xl">
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSeal} disabled={isSealing} className="rounded-xl">
              {isSealing ? t("bags.sealing") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
