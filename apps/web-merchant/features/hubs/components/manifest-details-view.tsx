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
  DataTable,
  ColumnDef,
} from "@dhruto/ui";
import { Truck, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ManifestStatus } from "@dhruto/contracts";
import {
  useGetManifestByIdQuery,
  useDispatchManifestMutation,
  useReceiveManifestMutation,
} from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { BAG_STATUS_TONE } from "@/config/status";
import { ManifestSummaryCard } from "./manifests/manifest-summary-card";
import { ManifestReceiveCard } from "./manifests/manifest-receive-card";
import { ManifestReconciliationCard } from "./manifests/manifest-reconciliation-card";

interface ManifestDetailsViewProps {
  manifestId: string;
}

/**
 * Manifest details: dispatch (origin, confirmed) and receive (destination,
 * reconciled bag by bag).
 */
export function ManifestDetailsView({ manifestId }: ManifestDetailsViewProps) {
  const t = useTranslations("Hub");
  const [dispatchConfirmOpen, setDispatchConfirmOpen] = React.useState(false);
  const [bagCodeInput, setBagCodeInput] = React.useState("");
  const [scannedBagCodes, setScannedBagCodes] = React.useState<string[]>([]);
  const [allowPartial, setAllowPartial] = React.useState(false);

  const { data, isLoading, isError, refetch } = useGetManifestByIdQuery(manifestId);
  const [dispatchMutation, { isLoading: isDispatching }] = useDispatchManifestMutation();
  const [receiveMutation, { isLoading: isReceiving }] = useReceiveManifestMutation();

  const manifest = data?.data;
  const reconciliation = manifest?.reconciliation;
  const receivable =
    manifest?.status === ManifestStatus.DISPATCHED ||
    manifest?.status === ManifestStatus.IN_TRANSIT;

  const handleDispatch = async () => {
    try {
      const res = await dispatchMutation(manifestId).unwrap();
      if (res.success) {
        toast.success(res.message);
        setDispatchConfirmOpen(false);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("manifests.dispatch")));
    }
  };

  const addScannedBag = (event?: React.FormEvent) => {
    event?.preventDefault();
    const code = bagCodeInput.trim().toUpperCase();
    if (!code) return;
    if (!scannedBagCodes.includes(code)) {
      setScannedBagCodes((prev) => [...prev, code]);
    }
    setBagCodeInput("");
  };

  const removeScannedBag = (code: string) => {
    setScannedBagCodes((prev) => prev.filter((entry) => entry !== code));
  };

  const handleReceive = async () => {
    try {
      const res = await receiveMutation({
        manifestId,
        receipt: { scannedBagCodes, allowPartial },
      }).unwrap();
      toast.success(res.message);
      setScannedBagCodes([]);
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("manifests.receiveTitle")));
    }
  };

  const bagColumns = React.useMemo<ColumnDef<NonNullable<typeof manifest>["bags"][number]>[]>(() => [
    {
      accessorKey: "bagCode",
      header: "Bag",
      cell: ({ row }) => (
        <Link
          href={HUB_ROUTES.bag(row.original.id)}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {row.original.bagCode}
        </Link>
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
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <EnumBadge namespace="BagStatus" value={row.original.status} tones={BAG_STATUS_TONE} className="text-[10px]" />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("actions")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Link href={HUB_ROUTES.bag(row.original.id)}>
            <Button size="sm" variant="ghost" className="h-8 rounded-xl bg-surface-muted/60 text-xs font-semibold hover:bg-surface-muted">
              {t("bags.details")}
            </Button>
          </Link>
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

  if (isError || !manifest) {
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
      {/* State banners */}
      {manifest.status === ManifestStatus.DISPATCHED ||
      manifest.status === ManifestStatus.IN_TRANSIT ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-info-soft px-4 py-3 text-xs font-semibold text-info shadow-xs"
        >
          <Truck className="h-4 w-4" aria-hidden="true" />
          {t("manifests.dispatchedBanner")}
        </p>
      ) : null}
      {manifest.status === ManifestStatus.RECEIVED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-success-soft px-4 py-3 text-xs font-semibold text-success shadow-xs"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("manifests.receivedBanner")}
        </p>
      ) : null}
      {manifest.status === ManifestStatus.RECONCILED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-warning-soft px-4 py-3 text-xs font-semibold text-warning shadow-xs"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {t("manifests.reconciledBanner")}
        </p>
      ) : null}

      {/* Summary telemetry card */}
      <ManifestSummaryCard manifest={manifest} />

      {/* Dispatch action card (while CREATED) */}
      {manifest.status === ManifestStatus.CREATED ? (
        <div className="relative rounded-3xl border border-primary/20 bg-card/90 backdrop-blur-md p-5 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <p className="text-sm text-muted-foreground">{t("manifests.dispatchConfirmMessage")}</p>
          <Button
            onClick={() => setDispatchConfirmOpen(true)}
            className="gap-1.5 rounded-xl font-semibold shadow-xs"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {t("manifests.dispatch")}
          </Button>
        </div>
      ) : null}

      {/* Bags in manifest DataTable */}
      <div className="relative rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md overflow-hidden shadow-sm">
        {/* Specular top highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">
              {t("manifests.bagsInManifest")}
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {manifest.bags.length}
            </span>
          </div>
        </div>
        <div>
          {manifest.bags.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Truck} title={t("bags.empty")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  columns={bagColumns}
                  data={manifest.bags}
                  totalItems={manifest.bags.length}
                  pageCount={1}
                  currentPage={1}
                  itemsPerPage={Math.max(10, manifest.bags.length)}
                  hidePagination={manifest.bags.length <= 10}
                  emptyMessage={t("bags.empty")}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
              <ul className="divide-y divide-border/20 md:hidden">
                {manifest.bags.map((bag) => (
                  <li key={bag.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={HUB_ROUTES.bag(bag.id)}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {bag.bagCode}
                      </Link>
                      <EnumBadge namespace="BagStatus" value={bag.status} tones={BAG_STATUS_TONE} className="text-[10px]" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("bags.parcelCount", { count: bag.parcelCount })}
                    </p>
                    <Link href={HUB_ROUTES.bag(bag.id)}>
                      <Button size="sm" variant="ghost" className="h-8 w-full rounded-xl bg-surface-muted/60 text-xs font-semibold">
                        {t("bags.details")}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Receiving card (destination, while in transit) */}
      {receivable ? (
        <ManifestReceiveCard
          bagCodeInput={bagCodeInput}
          setBagCodeInput={setBagCodeInput}
          scannedBagCodes={scannedBagCodes}
          onAddBag={addScannedBag}
          onRemoveBag={removeScannedBag}
          allowPartial={allowPartial}
          setAllowPartial={setAllowPartial}
          onReceive={handleReceive}
          isReceiving={isReceiving}
        />
      ) : null}

      {/* Reconciliation card */}
      {reconciliation ? (
        <ManifestReconciliationCard reconciliation={reconciliation} />
      ) : null}

      {/* Dispatch confirmation dialog */}
      <Dialog open={dispatchConfirmOpen} onOpenChange={setDispatchConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border/60 bg-surface-elevated p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{t("manifests.dispatchConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {t("manifests.dispatchConfirmMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDispatchConfirmOpen(false)}
              className="rounded-xl"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleDispatch}
              disabled={isDispatching}
              className="rounded-xl font-semibold"
            >
              {isDispatching ? t("manifests.dispatching") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
