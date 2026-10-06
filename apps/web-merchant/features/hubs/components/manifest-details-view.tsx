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
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

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
    manifest?.status === ManifestStatus.DISPATCHED || manifest?.status === ManifestStatus.IN_TRANSIT;

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
      const res = await receiveMutation({ manifestId, receipt: { scannedBagCodes, allowPartial } }).unwrap();
      toast.success(res.message);
      setScannedBagCodes([]);
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("manifests.receiveTitle")));
    }
  };

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
      {manifest.status === ManifestStatus.DISPATCHED || manifest.status === ManifestStatus.IN_TRANSIT ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-info bg-info-soft px-4 py-3 text-xs font-semibold text-info">
          <Truck className="h-4 w-4" aria-hidden="true" />
          {t("manifests.dispatchedBanner")}
        </p>
      ) : null}
      {manifest.status === ManifestStatus.RECEIVED ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-success bg-success-soft px-4 py-3 text-xs font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("manifests.receivedBanner")}
        </p>
      ) : null}
      {manifest.status === ManifestStatus.RECONCILED ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-xs font-semibold text-warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {t("manifests.reconciledBanner")}
        </p>
      ) : null}

      {/* Summary */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.details")}</p>
            <p className="font-mono text-sm font-bold text-foreground">{manifest.manifestCode}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("status")}</p>
            <Badge className="mt-1 text-[11px]">{manifest.status}</Badge>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Route</p>
            <p className="text-sm font-semibold text-foreground">
              {manifest.originHubName} → {manifest.destinationHubName}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.vehicle")}</p>
            <p className="font-mono text-sm text-foreground">{manifest.vehicleNumber}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.bagsInManifest")}</p>
            <p className="font-mono text-sm font-bold tabular-nums text-foreground">
              {manifest.bagCount} · {t("manifests.parcelCount", { count: manifest.parcelCount })}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.driverName")}</p>
            <p className="text-sm text-foreground">{manifest.driverName ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch (origin, while CREATED) */}
      {manifest.status === ManifestStatus.CREATED ? (
        <Card className="border-primary/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("manifests.dispatchConfirmMessage")}</p>
            <Button onClick={() => setDispatchConfirmOpen(true)} className="gap-1.5">
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("manifests.dispatch")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Bags */}
      <Card>
        <CardContent className="p-0">
          <h2 className="border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t("manifests.bagsInManifest")} ({manifest.bags.length})
          </h2>
          <ul className="divide-y divide-border">
            {manifest.bags.map((bag) => (
              <li key={bag.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
                <Link href={HUB_ROUTES.bag(bag.id)} className="font-mono font-semibold text-primary hover:underline">
                  {bag.bagCode}
                </Link>
                <span className="text-muted-foreground">
                  {t("bags.parcelCount", { count: bag.parcelCount })}
                </span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{bag.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Receive (destination, while in transit) */}
      {receivable ? (
        <Card className="border-primary/20">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">{t("manifests.receiveTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("manifests.receiveHint")}</p>
            </div>
            <form onSubmit={addScannedBag} className="flex gap-2">
              <Input
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                value={bagCodeInput}
                onChange={(event) => setBagCodeInput(event.target.value)}
                placeholder={t("manifests.bagCodePlaceholder")}
                aria-label={t("manifests.scannedBags")}
                className="h-11 font-mono uppercase"
              />
              <Button type="submit" disabled={!bagCodeInput.trim()} className="h-11">
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
            <Button onClick={handleReceive} disabled={isReceiving} className="w-full gap-1.5 sm:w-auto">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              {isReceiving ? t("manifests.receiving") : t("manifests.completeReceive")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Reconciliation */}
      {reconciliation ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("manifests.reconciliation")}
            </h2>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.expected")}</p>
                <p className="font-mono text-xl font-bold tabular-nums">{reconciliation.expectedBagCount}</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.received")}</p>
                <p className="font-mono text-xl font-bold tabular-nums">{reconciliation.receivedBagCount}</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.missing")}</p>
                <p className="font-mono text-xl font-bold tabular-nums">{reconciliation.missingBagCodes.length}</p>
              </div>
              <div className="rounded-lg bg-surface-muted p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("manifests.expected")} parcels</p>
                <p className="font-mono text-xl font-bold tabular-nums">
                  {reconciliation.receivedParcelCount}/{reconciliation.expectedParcelCount}
                </p>
              </div>
            </div>
            {reconciliation.missingBagCodes.length > 0 ? (
              <div className="rounded-lg border border-warning bg-warning-soft p-3 text-xs">
                <p className="font-semibold text-warning">{t("manifests.missing")}:</p>
                <p className="font-mono text-warning">{reconciliation.missingBagCodes.join(", ")}</p>
              </div>
            ) : null}
            {reconciliation.missingTrackingCodes.length > 0 ? (
              <div className="rounded-lg border border-warning bg-warning-soft p-3 text-xs">
                <p className="font-semibold text-warning">{t("manifests.missing")} parcels:</p>
                <p className="font-mono text-warning">{reconciliation.missingTrackingCodes.join(", ")}</p>
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
