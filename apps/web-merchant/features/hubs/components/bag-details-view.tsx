"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DataTable,
  ColumnDef,
} from "@dhruto/ui";
import { Package, Lock, Scan, AlertTriangle, CheckCircle2, Truck } from "lucide-react";
import { BagStatus } from "@dhruto/contracts";
import { useGetBagByIdQuery, useAddParcelToBagMutation, useSealBagMutation } from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { BAG_STATUS_TONE } from "@/config/status";
import { StatusBadge } from "@/components/data-display/status-badge";

interface BagDetailsViewProps {
  bagId: string;
}

/** Bag details: membership, parcel intake while OPEN, irreversible sealing. */
export function BagDetailsView({ bagId }: BagDetailsViewProps) {
  const t = useTranslations("Hub");
  const [trackingInput, setTrackingInput] = React.useState("");
  const [sealTagInput, setSealTagInput] = React.useState("");
  const [confirmSealOpen, setConfirmSealOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, refetch } = useGetBagByIdQuery(bagId);
  const [addParcelMutation, { isLoading: isAdding }] = useAddParcelToBagMutation();
  const [sealBagMutation, { isLoading: isSealing }] = useSealBagMutation();

  const bag = data?.data;
  const isOpen = bag?.status === BagStatus.OPEN;

  React.useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen, bag?.id]);

  const handleAddParcel = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = trackingInput.trim();
    if (!code) return;
    try {
      const res = await addParcelMutation({ bagId, parcel: { parcelTrackingCode: code } }).unwrap();
      if (res.success) {
        toast.success(res.message);
        setTrackingInput("");
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("scanner.errorTitle")));
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleSeal = async () => {
    const tag = sealTagInput.trim();
    if (tag.length < 2) {
      toast.error(t("bags.sealTagPlaceholder"));
      return;
    }
    try {
      const res = await sealBagMutation({ bagId, seal: { sealTag: tag } }).unwrap();
      if (res.success) {
        toast.success(res.message);
        setConfirmSealOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("bags.seal")));
    }
  };

  const parcelColumns = React.useMemo<ColumnDef<NonNullable<typeof bag>["parcels"][number]>[]>(() => [
    {
      accessorKey: "trackingCode",
      header: "Tracking ID",
      cell: ({ row }) => (
        <Link
          href={`/track?code=${row.original.trackingCode}`}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {row.original.trackingCode}
        </Link>
      ),
    },
    {
      accessorKey: "recipientName",
      header: "Recipient",
      cell: ({ row }) => <span className="text-xs font-medium text-foreground">{row.original.recipientName}</span>,
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusBadge status={row.original.status} className="text-[10px]" />
        </div>
      ),
    },
  ], [t]);

  if (isLoading) {
    return (
      <p role="status" className="py-16 text-center text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }

  if (isError || !bag) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="error"
        title={t("scanner.errorTitle")}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner — text + icon, never color alone */}
      {bag.status === BagStatus.SEALED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 text-xs font-semibold text-success"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          {t("bags.sealedBanner")}
        </p>
      ) : null}
      {bag.status === BagStatus.IN_TRANSIT ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-info-soft px-4 py-3 text-xs font-semibold text-info"
        >
          <Truck className="h-4 w-4" aria-hidden="true" />
          {t("bags.inTransitBanner")}
        </p>
      ) : null}
      {bag.status === BagStatus.RECEIVED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 text-xs font-semibold text-success"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("bags.receivedBanner")}
        </p>
      ) : null}

      {/* Summary */}
      <div className="rounded-3xl bg-surface-elevated overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">{t("bags.details")}</span>
            <span className="text-muted-foreground/40 font-light">·</span>
            <span className="rounded-lg bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
              {bag.bagCode}
            </span>
          </div>
          <EnumBadge namespace="BagStatus" value={bag.status} tones={BAG_STATUS_TONE} className="text-[10px]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Bag Code
            </p>
            <p className="font-mono text-sm font-bold text-foreground">{bag.bagCode}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("status")}
            </p>
            <div className="mt-1">
              <EnumBadge namespace="BagStatus" value={bag.status} tones={BAG_STATUS_TONE} className="text-[11px]" />
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("bags.destination")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {bag.destinationHubName} ({bag.destinationHubCode})
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("bags.parcelsInBag")}
            </p>
            <p className="font-mono text-sm font-bold tabular-nums text-foreground">
              {t("bags.parcelCount", { count: bag.parcelCount })} ·{" "}
              {t("bags.totalWeight", { weight: bag.totalWeightKg })}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("bags.createdBy")}
            </p>
            <p className="text-sm text-foreground">{bag.createdByName ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("bags.sealedBy")}
            </p>
            <p className="text-sm text-foreground">{bag.sealedByName ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("bags.sealTag")}
            </p>
            <p className="font-mono text-sm text-foreground">{bag.sealTag ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("bags.manifest")}
            </p>
            {bag.manifestId && bag.manifestCode ? (
              <Link
                href={HUB_ROUTES.manifest(bag.manifestId)}
                className="font-mono text-sm font-semibold text-primary hover:underline"
              >
                {bag.manifestCode}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Parcel intake while OPEN */}
      {isOpen ? (
        <div className="rounded-3xl bg-primary/5 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">{t("bags.addParcel")}</h3>
              <p className="text-xs text-muted-foreground">{t("bags.addParcelPlaceholder")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmSealOpen(true)}
              className="gap-1.5 rounded-xl bg-surface-elevated text-xs font-semibold hover:bg-surface-muted"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {t("bags.seal")}
            </Button>
          </div>
          <form onSubmit={handleAddParcel} className="flex gap-2.5">
            <div className="relative flex-1">
              <Scan
                className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={inputRef}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                value={trackingInput}
                onChange={(event) => setTrackingInput(event.target.value)}
                placeholder={t("bags.addParcelPlaceholder")}
                aria-label={t("bags.addParcel")}
                disabled={isAdding}
                className="h-12 rounded-2xl border-0 bg-surface-muted/60 pl-11 font-mono text-base uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground focus:bg-background"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={isAdding || !trackingInput.trim()}
              className="h-12 rounded-2xl px-7 font-semibold"
            >
              {isAdding ? t("bags.adding") : t("bags.addParcel")}
            </Button>
          </form>
        </div>
      ) : null}

      {/* Membership */}
      <div className="rounded-3xl bg-surface-elevated overflow-hidden">
        <div className="flex items-center justify-between p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">
              {t("bags.parcelsInBag")}
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {bag.parcels.length}
            </span>
          </div>
        </div>
        <div>
          {bag.parcels.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Package} title={t("bags.noParcels")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={parcelColumns}
                  data={bag.parcels}
                  totalItems={bag.parcels.length}
                  pageCount={1}
                  currentPage={1}
                  itemsPerPage={Math.max(10, bag.parcels.length)}
                  hidePagination={bag.parcels.length <= 10}
                  emptyMessage={t("bags.noParcels")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              <ul className="divide-y divide-border/20 md:hidden">
                {bag.parcels.map((parcel) => (
                  <li key={parcel.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs">
                    <div>
                      <Link
                        href={`/track?code=${parcel.trackingCode}`}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {parcel.trackingCode}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{parcel.recipientName}</p>
                    </div>
                    <StatusBadge status={parcel.status} className="text-[10px]" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <Dialog open={confirmSealOpen} onOpenChange={setConfirmSealOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0 bg-surface-elevated p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{t("bags.sealConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{t("bags.sealConfirmMessage")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <label htmlFor="bag-seal-tag" className="text-xs font-semibold text-muted-foreground">
              {t("bags.sealTag")} *
            </label>
            <input
              id="bag-seal-tag"
              type="text"
              value={sealTagInput}
              onChange={(event) => setSealTagInput(event.target.value)}
              placeholder={t("bags.sealTagPlaceholder")}
              maxLength={100}
              className="w-full rounded-2xl border-0 bg-surface-muted/60 p-3.5 font-mono text-sm uppercase outline-none focus:bg-background"
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
