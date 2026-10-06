"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { RiderTasksView } from "./rider-tasks-view";
import { TaskDetailsView } from "./task-details-view";
import { RiderHistoryView } from "./rider-history-view";
import { RiderProfileView } from "./rider-profile-view";

/** Client wrappers so rider route pages stay server components with metadata. */
export function RiderTasksPage() {
  const t = useTranslations("Rider");
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <PageHeader title={t("tasks.title")} description={t("tasks.subtitle")} />
      <RiderTasksView />
    </div>
  );
}

export function RiderTaskDetailsPage({ parcelId }: { parcelId: string }) {
  const t = useTranslations("Rider");
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <PageHeader title={t("details.title")} />
      <TaskDetailsView parcelId={parcelId} />
    </div>
  );
}

export function RiderHistoryPage() {
  const t = useTranslations("Rider");
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <PageHeader title={t("history.title")} description={t("history.subtitle")} />
      <RiderHistoryView />
    </div>
  );
}

export function RiderProfilePage() {
  const t = useTranslations("Rider");
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <PageHeader title={t("profile.title")} />
      <RiderProfileView />
    </div>
  );
}
