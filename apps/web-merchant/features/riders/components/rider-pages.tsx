"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";
import { ArrowLeft } from "lucide-react";
import { RiderTasksView } from "./rider-tasks-view";
import { TaskDetailsView } from "./task-details-view";
import { RiderHistoryView } from "./rider-history-view";
import { RiderProfileView } from "./rider-profile-view";

/** Client wrappers so rider route pages stay server components with metadata. */
export function RiderTasksPage() {
  const t = useTranslations("Rider");
  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader title={t("tasks.title")} description={t("tasks.subtitle")} />
      <RiderTasksView />
    </div>
  );
}

export function RiderTaskDetailsPage({ parcelId }: { parcelId: string }) {
  const t = useTranslations("Rider");
  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader
        title={t("details.title")}
        description="Verify recipient OTP, collect payment, and complete the package handover."
        actions={
          <Link
            href={RIDER_ROUTES.tasks}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white shadow-2xs backdrop-blur-md transition-all hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("tasks.title")}</span>
          </Link>
        }
      />
      <TaskDetailsView parcelId={parcelId} />
    </div>
  );
}

export function RiderHistoryPage() {
  const t = useTranslations("Rider");
  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader title={t("history.title")} description={t("history.subtitle")} />
      <RiderHistoryView />
    </div>
  );
}

export function RiderProfilePage() {
  const t = useTranslations("Rider");
  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader title={t("profile.title")} />
      <RiderProfileView />
    </div>
  );
}
