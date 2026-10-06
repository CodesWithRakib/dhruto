"use client";

import { useTranslations } from "next-intl";
import { HubPageShell } from "./hub-page-shell";
import { HubScanner } from "./hub-scanner";
import { BagManager } from "./bag-manager";
import { BagDetailsView } from "./bag-details-view";
import { ManifestManager } from "./manifest-manager";
import { ManifestDetailsView } from "./manifest-details-view";
import { ParcelLookupView } from "./parcel-lookup-view";
import { ExceptionsView } from "./exceptions-view";

/** Client wrappers so route pages stay server components with metadata. */
export function HubScannerPage() {
  const t = useTranslations("Hub");
  return (
    <HubPageShell
      title={t("scanner.title")}
      description={(hub) => t("scanner.subtitle", { hub: hub.name })}
    >
      {(hub) => <HubScanner hubId={hub.id} hubName={hub.name} />}
    </HubPageShell>
  );
}

export function HubParcelsPage() {
  const t = useTranslations("Hub");
  return (
    <HubPageShell
      title={t("lookup.title")}
      description={(hub) => t("lookup.subtitle", { hub: hub.name })}
    >
      {(hub) => <ParcelLookupView currentHubId={hub.id} />}
    </HubPageShell>
  );
}

export function HubBagsPage() {
  const t = useTranslations("Hub");
  return (
    <HubPageShell title={t("bags.title")} description={t("bags.subtitle")}>
      {(hub) => <BagManager currentHubId={hub.id} />}
    </HubPageShell>
  );
}

export function HubBagDetailsPage({ bagId }: { bagId: string }) {
  const t = useTranslations("Hub");
  return (
    <HubPageShell title={t("bags.details")}>
      {() => <BagDetailsView bagId={bagId} />}
    </HubPageShell>
  );
}

export function HubManifestsPage() {
  const t = useTranslations("Hub");
  return (
    <HubPageShell title={t("manifests.title")} description={t("manifests.subtitle")}>
      {(hub) => <ManifestManager currentHubId={hub.id} />}
    </HubPageShell>
  );
}

export function HubManifestDetailsPage({ manifestId }: { manifestId: string }) {
  const t = useTranslations("Hub");
  return (
    <HubPageShell title={t("manifests.details")}>
      {() => <ManifestDetailsView manifestId={manifestId} />}
    </HubPageShell>
  );
}

export function HubExceptionsPage() {
  const t = useTranslations("Hub");
  return (
    <HubPageShell title={t("exceptions.title")} description={t("exceptions.subtitle")}>
      {(hub) => <ExceptionsView currentHubId={hub.id} />}
    </HubPageShell>
  );
}
