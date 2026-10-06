"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
} from "@dhruto/ui";
import { Truck, Plus, Send, AlertCircle, FileText, ArrowRight } from "lucide-react";
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
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

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

  const { data: manifestsData, isLoading: isLoadingManifests, refetch: refetchManifests } =
    useGetManifestsQuery(currentHubId);
  const { data: bagsData, refetch: refetchBags } = useGetBagsQuery({ hubId: currentHubId, status: BagStatus.SEALED });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Truck className="h-6 w-6 text-primary" aria-hidden="true" />
            {t("manifests.title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("manifests.subtitle")}</p>
        </div>
        <Button onClick={() => setIsCreating((value) => !value)} className="flex items-center gap-2">
          {isCreating ? t("cancel") : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" /> {t("manifests.create")}
            </>
          )}
        </Button>
      </div>

      {isCreating ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("manifests.create")}
            </CardTitle>
            <CardDescription>{t("manifests.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateManifest} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="manifest-destination" className="mb-1 block text-sm font-medium">
                    {t("manifests.destination")} <span className="text-danger">*</span>
                  </label>
                  <select
                    id="manifest-destination"
                    value={destHubId}
                    onChange={(event) => {
                      setDestHubId(event.target.value);
                      setSelectedBagIds([]);
                    }}
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {destinations.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name} ({hub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="manifest-vehicle" className="mb-1 block text-sm font-medium">
                    {t("manifests.vehicle")} <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="manifest-vehicle"
                    placeholder={t("manifests.vehiclePlaceholder")}
                    value={vehicleNumber}
                    onChange={(event) => setVehicleNumber(event.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="manifest-driver" className="mb-1 block text-sm font-medium">
                    {t("manifests.driverName")}
                  </label>
                  <Input
                    id="manifest-driver"
                    value={driverName}
                    onChange={(event) => setDriverName(event.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="manifest-driver-phone" className="mb-1 block text-sm font-medium">
                    {t("manifests.driverPhone")}
                  </label>
                  <Input
                    id="manifest-driver-phone"
                    value={driverPhone}
                    onChange={(event) => setDriverPhone(event.target.value)}
                  />
                </div>
              </div>

              <div className="border-t pt-2">
                <p className="mb-2 text-sm font-semibold">
                  {t("manifests.selectBags", { count: selectedBagIds.length })}
                </p>
                <p className="mb-2 text-xs text-muted-foreground">{t("manifests.selectBagsHint")}</p>

                {availableBags.length === 0 ? (
                  <div className="rounded-lg border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                    <AlertCircle className="mx-auto mb-1 h-5 w-5 text-warning" aria-hidden="true" />
                    {t("manifests.noSealedBags")}
                  </div>
                ) : (
                  <div className="grid max-h-56 grid-cols-1 gap-3 overflow-y-auto rounded-lg border bg-muted/20 p-2 sm:grid-cols-2 md:grid-cols-3">
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
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-all ${
                            isSelected ? "border-primary bg-primary/10" : "border-border bg-surface"
                          }`}
                        >
                          <input type="checkbox" checked={isSelected} onChange={() => {}} tabIndex={-1} aria-hidden="true" className="mt-0.5 rounded" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-xs font-semibold">{bag.bagCode}</p>
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

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isCreatingManifest || selectedBagIds.length === 0}>
                  {isCreatingManifest ? t("manifests.creating") : t("manifests.create")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {isLoadingManifests ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : manifests.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Truck} title={t("manifests.empty")} description={t("manifests.emptyDescription")} />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Manifest</th>
                      <th className="px-4 py-3 font-semibold">Route</th>
                      <th className="px-4 py-3 font-semibold">{t("manifests.vehicle")}</th>
                      <th className="px-4 py-3 text-center font-semibold">{t("bags.title")}</th>
                      <th className="px-4 py-3 text-center font-semibold">{t("status")}</th>
                      <th className="px-4 py-3 text-right font-semibold">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {manifests.map((manifest) => (
                      <tr key={manifest.id}>
                        <td className="px-4 py-3">
                          <Link href={HUB_ROUTES.manifest(manifest.id)} className="font-mono text-xs font-semibold text-primary hover:underline">
                            {manifest.manifestCode}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-medium">{manifest.originHubName}</span>
                          <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <span className="font-medium text-primary">{manifest.destinationHubName}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{manifest.vehicleNumber}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary" className="font-mono">
                            {manifest.bagCount}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={manifest.status === ManifestStatus.CREATED ? "secondary" : manifest.status === ManifestStatus.DISPATCHED || manifest.status === ManifestStatus.IN_TRANSIT ? "default" : "success"} className="text-[10px]">
                            {manifest.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {manifest.status === ManifestStatus.CREATED ? (
                              <Button size="sm" onClick={() => handleDispatch(manifest.id)} disabled={isDispatching} className="h-8 gap-1.5">
                                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("manifests.dispatch")}
                              </Button>
                            ) : null}
                            <Link href={HUB_ROUTES.manifest(manifest.id)}>
                              <Button size="sm" variant="outline" className="h-8 gap-1">
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("bags.details")}
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border md:hidden">
                {manifests.map((manifest) => (
                  <li key={manifest.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={HUB_ROUTES.manifest(manifest.id)} className="font-mono text-xs font-bold text-primary">
                        {manifest.manifestCode}
                      </Link>
                      <Badge variant="secondary" className="text-[10px]">{manifest.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {manifest.originHubName} → {manifest.destinationHubName} · {manifest.bagCount} {t("bags.title")}
                    </p>
                    <div className="flex gap-2">
                      {manifest.status === ManifestStatus.CREATED ? (
                        <Button size="sm" onClick={() => handleDispatch(manifest.id)} disabled={isDispatching} className="h-9 flex-1">
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("manifests.dispatch")}
                        </Button>
                      ) : null}
                      <Link href={HUB_ROUTES.manifest(manifest.id)} className="flex-1">
                        <Button size="sm" variant="outline" className="h-9 w-full">
                          {t("bags.details")}
                        </Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
