"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import { Package, Plus, Lock } from "lucide-react";
import { BagStatus } from "@dhruto/contracts";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Package className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("bags.title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("bags.subtitle")}</p>
        </div>
        <Button
          onClick={() => setIsCreating((value) => !value)}
          className="flex items-center gap-2 text-xs"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {isCreating ? t("cancel") : t("bags.create")}
        </Button>
      </div>

      {isCreating ? (
        <Card className="border-primary/30 bg-primary/5 p-6">
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
                <select
                  id="bag-destination"
                  value={destHubId}
                  onChange={(event) => setDestHubId(event.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-medium outline-none"
                  required
                >
                  {destinations.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name} ({hub.code})
                    </option>
                  ))}
                </select>
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
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingBag}>
                {isCreatingBag ? t("bags.creating") : t("bags.confirmCreate")}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="border-primary/20">
        <CardContent className="p-0">
          {isLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : bags.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Package}
                title={t("bags.empty")}
                description={t("bags.emptyDescription")}
              />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Bag</th>
                      <th className="px-4 py-3 font-semibold">{t("bags.destination")}</th>
                      <th className="px-4 py-3 font-semibold">{t("status")}</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {t("bags.parcelsInBag")}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bags.map((bag) => (
                      <tr key={bag.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={HUB_ROUTES.bag(bag.id)}
                            className="font-mono font-bold text-primary hover:underline"
                          >
                            {bag.bagCode}
                          </Link>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {bag.sealTag ?? ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">{bag.destinationHubName}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              bag.status === BagStatus.OPEN
                                ? "secondary"
                                : bag.status === BagStatus.SEALED
                                  ? "default"
                                  : "success"
                            }
                            className="text-[10px]"
                          >
                            {
                              <EnumBadge
                                namespace="BagStatus"
                                value={bag.status}
                                tones={BAG_STATUS_TONE}
                              />
                            }
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {bag.parcelCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {bag.status === BagStatus.OPEN ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSealConfirm(bag.id)}
                                className="h-7 text-[11px]"
                              >
                                <Lock className="h-3 w-3" aria-hidden="true" />
                                {t("bags.seal")}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {bags.map((bag) => (
                  <li key={bag.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={HUB_ROUTES.bag(bag.id)}
                        className="font-mono text-xs font-bold text-primary"
                      >
                        {bag.bagCode}
                      </Link>
                      <Badge
                        variant={bag.status === BagStatus.OPEN ? "secondary" : "default"}
                        className="text-[10px]"
                      >
                        {
                          <EnumBadge
                            namespace="BagStatus"
                            value={bag.status}
                            tones={BAG_STATUS_TONE}
                          />
                        }
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bag.destinationHubName} · {t("bags.parcelCount", { count: bag.parcelCount })}
                    </p>
                    {bag.status === BagStatus.OPEN ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSealConfirm(bag.id)}
                        className="h-9 w-full"
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
        </CardContent>
      </Card>

      {/* Seal confirmation — sealing freezes membership irreversibly */}
      <Dialog open={confirmSealOpen} onOpenChange={setConfirmSealOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("bags.sealConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("bags.sealConfirmMessage")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
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
              className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-sm outline-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmSealOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSeal} disabled={isSealing}>
              {isSealing ? t("bags.sealing") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
