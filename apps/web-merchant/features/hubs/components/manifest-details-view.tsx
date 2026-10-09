"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Badge,
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
import { Truck, Send, PackageCheck, AlertTriangle, CheckCircle2, X } from "lucide-react";
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
import { MANIFEST_STATUS_TONE, BAG_STATUS_TONE } from "@/config/status";

interface ManifestDetailsViewProps {
  manifestId: string;
}

/**
 * Manifest details: dispatch (origin, confirmed) and receive (destination,
 * reconciled bag by bag). An unexpected bag is rejected, never absorbed;
 * missing bags block completion unless a partial receipt is explicit.
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
            <Button size="sm" variant="outline" className="h-8 rounded-lg border-border/80 text-xs font-medium">
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
          className="flex items-center gap-2 rounded-xl border border-info bg-info-soft px-4 py-3 text-xs font-semibold text-info"
        >
          <Truck className="h-4 w-4" aria-hidden="true" />
          {t("manifests.dispatchedBanner")}
        </p>
      ) : null}
      {manifest.status === ManifestStatus.RECEIVED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success bg-success-soft px-4 py-3 text-xs font-semibold text-success"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("manifests.receivedBanner")}
        </p>
      ) : null}
      {manifest.status === ManifestStatus.RECONCILED ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-xs font-semibold text-warning"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {t("manifests.reconciledBanner")}
        </p>
      ) : null}

      {/* Summary */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/15 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">{t("manifests.details")}</span>
            <span className="text-muted-foreground/40 font-light">·</span>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
              {manifest.manifestCode}
            </span>
          </div>
          <EnumBadge
            namespace="ManifestStatus"
            value={manifest.status}
            tones={MANIFEST_STATUS_TONE}
            className="text-[10px]"
          />
        </div>
        <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Manifest Code
            </p>
            <p className="font-mono text-sm font-bold text-foreground">{manifest.manifestCode}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("status")}
            </p>
            <div className="mt-1">
              <EnumBadge
                namespace="ManifestStatus"
                value={manifest.status}
                tones={MANIFEST_STATUS_TONE}
                className="text-[11px]"
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Route</p>
            <p className="text-sm font-semibold text-foreground">
              {manifest.originHubName} → {manifest.destinationHubName}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("manifests.vehicle")}
            </p>
            <p className="font-mono text-sm text-foreground">{manifest.vehicleNumber}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("manifests.bagsInManifest")}
            </p>
            <p className="font-mono text-sm font-bold tabular-nums text-foreground">
              {manifest.bagCount} · {t("manifests.parcelCount", { count: manifest.parcelCount })}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("manifests.driverName")}
            </p>
            <p className="text-sm text-foreground">{manifest.driverName ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch (origin, while CREATED) */}
      {manifest.status === ManifestStatus.CREATED ? (
        <Card className="rounded-2xl border border-primary/20 bg-primary/5 shadow-xs overflow-hidden">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("manifests.dispatchConfirmMessage")}</p>
            <Button onClick={() => setDispatchConfirmOpen(true)} className="gap-1.5 rounded-xl shadow-xs">
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("manifests.dispatch")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Bags in manifest DataTable */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/15 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">
              {t("manifests.bagsInManifest")}
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {manifest.bags.length}
            </span>
          </div>
        </div>
        <CardContent className="p-0">
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
              <ul className="divide-y divide-border/60 md:hidden">
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
                      <Button size="sm" variant="outline" className="h-8 w-full rounded-xl border-border/80 text-xs">
                        {t("bags.details")}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Receive (destination, while in transit) */}
      {receivable ? (
        <Card className="rounded-2xl border border-primary/20 bg-card shadow-xs overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">{t("manifests.receiveTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("manifests.receiveHint")}</p>
            </div>
            <form onSubmit={addScannedBag} className="flex gap-2.5">
              <Input
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                value={bagCodeInput}
                onChange={(event) => setBagCodeInput(event.target.value)}
                placeholder={t("manifests.bagCodePlaceholder")}
                aria-label={t("manifests.scannedBags")}
                className="h-12 rounded-xl font-mono uppercase"
              />
              <Button type="submit" disabled={!bagCodeInput.trim()} className="h-12 rounded-xl px-6 font-semibold shadow-xs">
                {t("manifests.addScannedBag")}
              </Button>
            </form>
            {scannedBagCodes.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {scannedBagCodes.map((code) => (
                  <li key={code}>
                    <Badge variant="default" className="gap-1 font-mono text-[11px]">
                      {code}
                      <button
                        type="button"
                        onClick={() => removeScannedBag(code)}
                        aria-label={`${t("close")} ${code}`}
                        className="ml-1 rounded-full hover:opacity-70"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allowPartial}
                onChange={(event) => setAllowPartial(event.target.checked)}
                className="mt-0.5 rounded"
              />
              {t("manifests.allowPartial")}
            </label>
            <Button
              onClick={handleReceive}
              disabled={isReceiving}
              className="w-full gap-1.5 rounded-xl shadow-xs sm:w-auto"
            >
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              {isReceiving ? t("manifests.receiving") : t("manifests.completeReceive")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Reconciliation */}
      {reconciliation ? (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("manifests.reconciliation")}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("manifests.expected")}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                  {reconciliation.expectedBagCount}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("manifests.received")}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                  {reconciliation.receivedBagCount}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("manifests.missing")}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                  {reconciliation.missingBagCodes.length}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("manifests.expected")} parcels
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                  {reconciliation.receivedParcelCount}/{reconciliation.expectedParcelCount}
                </p>
              </div>
            </div>
            {reconciliation.missingBagCodes.length > 0 ? (
              <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs">
                <p className="font-semibold text-warning">{t("manifests.missing")}:</p>
                <p className="font-mono text-warning">
                  {reconciliation.missingBagCodes.join(", ")}
                </p>
              </div>
            ) : null}
            {reconciliation.missingTrackingCodes.length > 0 ? (
              <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs">
                <p className="font-semibold text-warning">{t("manifests.missing")} parcels:</p>
                <p className="font-mono text-warning">
                  {reconciliation.missingTrackingCodes.join(", ")}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dispatchConfirmOpen} onOpenChange={setDispatchConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("manifests.dispatchConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("manifests.dispatchConfirmMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDispatchConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleDispatch} disabled={isDispatching}>
              {isDispatching ? t("manifests.dispatching") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
