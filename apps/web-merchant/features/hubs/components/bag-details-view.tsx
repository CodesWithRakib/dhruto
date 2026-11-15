"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, DataTable, ColumnDef } from "@dhruto/ui";
import { Package, Lock, AlertTriangle, CheckCircle2, Truck } from "lucide-react";
import { BagStatus } from "@dhruto/contracts";
import { useGetBagByIdQuery, useAddParcelToBagMutation, useSealBagMutation } from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Link } from "@/lib/navigation";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { BagSummaryCard } from "./bags/bag-summary-card";
import { BagAddParcelCard } from "./bags/bag-add-parcel-card";
import { BagSealDialog } from "./bags/bag-seal-dialog";

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
      {/* Status banner */}
      {bag.status === BagStatus.SEALED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-success-soft px-4 py-3 text-xs font-semibold text-success shadow-xs"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          {t("bags.sealedBanner")}
        </p>
      ) : null}
      {bag.status === BagStatus.IN_TRANSIT ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-info-soft px-4 py-3 text-xs font-semibold text-info shadow-xs"
        >
          <Truck className="h-4 w-4" aria-hidden="true" />
          {t("bags.inTransitBanner")}
        </p>
      ) : null}
      {bag.status === BagStatus.RECEIVED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-success-soft px-4 py-3 text-xs font-semibold text-success shadow-xs"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("bags.receivedBanner")}
        </p>
      ) : null}

      {/* Summary telemetry card */}
      <BagSummaryCard bag={bag} />

      {/* Parcel intake while OPEN */}
      {isOpen ? (
        <BagAddParcelCard
          ref={inputRef}
          trackingInput={trackingInput}
          setTrackingInput={setTrackingInput}
          onSubmit={handleAddParcel}
          onOpenSeal={() => setConfirmSealOpen(true)}
          isAdding={isAdding}
        />
      ) : null}

      {/* Membership list */}
      <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden shadow-sm">
        {/* Specular top highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">
              {t("bags.parcelsInBag")}
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
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

      {/* Seal confirmation dialog */}
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
