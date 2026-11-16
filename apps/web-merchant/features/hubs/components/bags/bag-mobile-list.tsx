"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@dhruto/ui";
import { BagStatus, type BagListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { BAG_STATUS_TONE } from "@/config/status";

interface BagMobileListProps {
  bags: BagListItem[];
  onOpenSeal: (id: string) => void;
}

export function BagMobileList({ bags, onOpenSeal }: BagMobileListProps) {
  const t = useTranslations("Hub");

  return (
    <ul className="divide-y divide-border/20 md:hidden">
      {bags.map((bag) => (
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
              onClick={() => onOpenSeal(bag.id)}
              className="h-9 w-full rounded-xl bg-surface-muted/60"
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              {t("bags.seal")}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
