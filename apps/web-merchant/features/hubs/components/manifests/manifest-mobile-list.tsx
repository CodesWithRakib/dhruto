"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { ManifestListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { MANIFEST_STATUS_TONE } from "@/config/status";

interface ManifestMobileListProps {
  manifests: ManifestListItem[];
}

export function ManifestMobileList({ manifests }: ManifestMobileListProps) {
  const t = useTranslations("Hub");

  return (
    <ul className="md:hidden">
      {manifests.map((manifest) => (
        <li key={manifest.id} className="space-y-2 p-4 transition-colors hover:bg-surface-muted/30">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={HUB_ROUTES.manifest(manifest.id)}
              className="font-mono text-xs font-bold text-primary hover:underline"
            >
              {manifest.manifestCode}
            </Link>
            <EnumBadge
              namespace="ManifestStatus"
              value={manifest.status}
              tones={MANIFEST_STATUS_TONE}
              className="text-[10px]"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {manifest.originHubName} → {manifest.destinationHubName} · {manifest.bagCount}{" "}
            {t("bags.title")}
          </p>
        </li>
      ))}
    </ul>
  );
}
