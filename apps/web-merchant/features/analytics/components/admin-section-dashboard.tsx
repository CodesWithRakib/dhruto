"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import {
  useGetParcelAnalyticsQuery,
  useGetDeliveryAnalyticsQuery,
  useGetHubAnalyticsQuery,
  useGetRiderAnalyticsQuery,
  useGetMerchantComparisonQuery,
  useGetRtoAnalyticsV2Query,
  useGetCodAnalyticsV2Query,
  useGetFinanceAnalyticsQuery,
  useGetNotificationAnalyticsQuery,
  useGetWebhookAnalyticsQuery,
  useGetIntelligenceAnalyticsQuery,
  useListAlertsQuery,
  useAcknowledgeAlertMutation,
  useListReportsQuery,
} from "../api/analytics.api";
import {
  FilterBar,
  filterFromSearch,
  filterToSearch,
  filterToApiParams,
  type FilterState,
} from "./filter-bar";
import { ExportButton } from "./export-button";
import { PageHeader } from "@/components/page-header";
import type { ExportDataset } from "@dhruto/contracts";
import { ParcelsSection, DeliverySection } from "./sections/parcels-delivery-sections";
import {
  HubsSection,
  RidersSection,
  MerchantsSection,
} from "./sections/fleet-hubs-merchants-sections";
import {
  RtoSection,
  CodSection,
  FinanceSection,
} from "./sections/finance-cod-rto-sections";
import {
  NotificationsSection,
  IntelSection,
  AlertsSection,
  ReportsSection,
} from "./sections/intel-alerts-reports-sections";

export type AnalyticsSection =
  | "parcels"
  | "delivery"
  | "hubs"
  | "riders"
  | "merchants"
  | "rto"
  | "cod"
  | "finance"
  | "notifications"
  | "intelligence"
  | "alerts"
  | "reports";

const SECTION_DATASET: Partial<Record<AnalyticsSection, ExportDataset>> = {
  parcels: "parcels",
  riders: "riders",
  hubs: "hubs",
  rto: "rto",
  cod: "cod",
  finance: "finance",
};

/** Section dashboard: one component, per-section queries, shared chrome. */
export function AdminSectionDashboard({ section }: { section: AnalyticsSection }) {
  const t = useTranslations("AnalyticsSections");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterState>(() => filterFromSearch(searchParams));
  const apiParams = React.useMemo(() => filterToApiParams(filter), [filter]);

  const applyFilter = (next: FilterState) => {
    setFilter(next);
    router.replace(`?${filterToSearch(next)}` as never);
  };

  const parcelsQ = useGetParcelAnalyticsQuery(apiParams, { skip: section !== "parcels" });
  const deliveryQ = useGetDeliveryAnalyticsQuery(apiParams, { skip: section !== "delivery" });
  const hubsQ = useGetHubAnalyticsQuery(apiParams, { skip: section !== "hubs" });
  const ridersQ = useGetRiderAnalyticsQuery(apiParams, { skip: section !== "riders" });
  const merchantsQ = useGetMerchantComparisonQuery(apiParams, { skip: section !== "merchants" });
  const rtoQ = useGetRtoAnalyticsV2Query(apiParams, { skip: section !== "rto" });
  const codQ = useGetCodAnalyticsV2Query(apiParams, { skip: section !== "cod" });
  const financeQ = useGetFinanceAnalyticsQuery(apiParams, { skip: section !== "finance" });
  const notificationsQ = useGetNotificationAnalyticsQuery(apiParams, {
    skip: section !== "notifications",
  });
  const webhooksQ = useGetWebhookAnalyticsQuery(apiParams, { skip: section !== "notifications" });
  const intelQ = useGetIntelligenceAnalyticsQuery(apiParams, { skip: section !== "intelligence" });
  const alertsQ = useListAlertsQuery(undefined, { skip: section !== "alerts" });
  const reportsQ = useListReportsQuery(undefined, { skip: section !== "reports" });
  const [ack] = useAcknowledgeAlertMutation();

  const dataset = SECTION_DATASET[section];

  return (
    <div className="relative w-full space-y-6">
      <PageHeader
        title={t(`section_${section}_title`)}
        description={t(`section_${section}_desc`)}
        actions={
          dataset ? (
            <ExportButton
              dataset={dataset}
              preset={filter.preset}
              from={apiParams.from}
              to={apiParams.to}
            />
          ) : undefined
        }
      />
      <FilterBar value={filter} onChange={applyFilter} />

      {section === "parcels" && (
        <ParcelsSection
          isLoading={parcelsQ.isLoading}
          isError={parcelsQ.isError}
          parcels={parcelsQ.data?.data}
          onRetry={() => parcelsQ.refetch()}
        />
      )}

      {section === "delivery" && (
        <DeliverySection
          isLoading={deliveryQ.isLoading}
          isError={deliveryQ.isError}
          delivery={deliveryQ.data?.data}
          onRetry={() => deliveryQ.refetch()}
        />
      )}

      {section === "hubs" && (
        <HubsSection
          isLoading={hubsQ.isLoading}
          isError={hubsQ.isError}
          hubs={hubsQ.data?.data?.hubs ?? []}
          onRetry={() => hubsQ.refetch()}
        />
      )}

      {section === "riders" && (
        <RidersSection
          isLoading={ridersQ.isLoading}
          isError={ridersQ.isError}
          riders={ridersQ.data?.data?.riders ?? []}
          limitations={ridersQ.data?.data?.limitations}
          onRetry={() => ridersQ.refetch()}
        />
      )}

      {section === "merchants" && (
        <MerchantsSection
          isLoading={merchantsQ.isLoading}
          isError={merchantsQ.isError}
          merchants={merchantsQ.data?.data?.merchants ?? []}
          onRetry={() => merchantsQ.refetch()}
        />
      )}

      {section === "rto" && (
        <RtoSection
          isLoading={rtoQ.isLoading}
          isError={rtoQ.isError}
          rto={rtoQ.data?.data}
          onRetry={() => rtoQ.refetch()}
        />
      )}

      {section === "cod" && (
        <CodSection
          isLoading={codQ.isLoading}
          isError={codQ.isError}
          cod={codQ.data?.data}
          onRetry={() => codQ.refetch()}
        />
      )}

      {section === "finance" && (
        <FinanceSection
          isLoading={financeQ.isLoading}
          isError={financeQ.isError}
          finance={financeQ.data?.data}
          onRetry={() => financeQ.refetch()}
        />
      )}

      {section === "notifications" && (
        <NotificationsSection
          isLoading={notificationsQ.isLoading || webhooksQ.isLoading}
          isError={notificationsQ.isError || webhooksQ.isError}
          notif={notificationsQ.data?.data}
          webhooks={webhooksQ.data?.data}
          onRetry={() => {
            notificationsQ.refetch();
            webhooksQ.refetch();
          }}
        />
      )}

      {section === "intelligence" && (
        <IntelSection
          isLoading={intelQ.isLoading}
          isError={intelQ.isError}
          address={intelQ.data?.data?.address}
          rto={intelQ.data?.data?.rto}
          byModelVersion={intelQ.data?.data?.byModelVersion ?? []}
          onRetry={() => intelQ.refetch()}
        />
      )}

      {section === "alerts" && (
        <AlertsSection
          isLoading={alertsQ.isLoading}
          isError={alertsQ.isError}
          alertItems={alertsQ.data?.data ?? []}
          onAck={(id) => ack(id).then(() => alertsQ.refetch())}
          onRetry={() => alertsQ.refetch()}
        />
      )}

      {section === "reports" && (
        <ReportsSection
          isLoading={reportsQ.isLoading}
          isError={reportsQ.isError}
          reportItems={reportsQ.data?.data ?? []}
          preset={filter.preset}
          from={apiParams.from}
          to={apiParams.to}
          onRetry={() => reportsQ.refetch()}
        />
      )}
    </div>
  );
}
