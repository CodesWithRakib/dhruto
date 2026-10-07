import { baseApi } from "../../../lib/api/base-api";
import {
  type AnalyticsQuery,
  type MerchantAnalyticsSummary,
  type OperationalAnalyticsSummary,
  type HubThroughputMetric,
  type TopRiderMetric,
  type RtoAnalytics,
  type CodFlowAnalytics,
  type OverviewResponse,
  type ParcelAnalyticsResponse,
  type HubAnalyticsItem,
  type RiderAnalyticsItem,
  type MerchantCompareItem,
  type RtoAnalyticsV2,
  type CodAnalyticsV2,
  type FinanceAnalyticsResponse,
  type NotificationAnalyticsResponse,
  type WebhookAnalyticsResponse,
  type IntelligenceAnalyticsResponse,
  type AnalyticsAlert,
  type ReportExport,
  type ExportDataset,
  type ExportFormat,
  type MetricDefinition,
  type ApiResponse,
} from "@dhruto/contracts";

export interface RangeParams {
  preset?: string;
  from?: string;
  to?: string;
  hubId?: string;
  riderId?: string;
  merchantId?: string;
  limit?: number;
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMerchantAnalytics: builder.query<
      ApiResponse<MerchantAnalyticsSummary>,
      AnalyticsQuery | void
    >({
      query: (params) => ({
        url: "/analytics/merchant/summary",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["Parcel", "Wallet"],
    }),

    getOperationalAnalytics: builder.query<
      ApiResponse<OperationalAnalyticsSummary>,
      AnalyticsQuery | void
    >({
      query: (params) => ({
        url: "/analytics/operations/overview",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["Parcel"],
    }),

    getHubThroughput: builder.query<ApiResponse<HubThroughputMetric[]>, AnalyticsQuery | void>({
      query: (params) => ({
        url: "/analytics/hubs/throughput",
        method: "GET",
        params: params || {},
      }),
    }),

    getRiderPerformance: builder.query<ApiResponse<TopRiderMetric[]>, AnalyticsQuery | void>({
      query: (params) => ({
        url: "/analytics/riders/performance",
        method: "GET",
        params: params || {},
      }),
    }),

    getRtoAnalytics: builder.query<ApiResponse<RtoAnalytics>, AnalyticsQuery | void>({
      query: (params) => ({
        url: "/analytics/rto",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["Parcel"],
    }),

    getCodAnalytics: builder.query<ApiResponse<CodFlowAnalytics>, AnalyticsQuery | void>({
      query: (params) => ({
        url: "/analytics/cod",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["Wallet", "Parcel"],
    }),

    getMetricCatalog: builder.query<ApiResponse<MetricDefinition[]>, void>({
      query: () => "/analytics/metrics",
    }),

    getAnalyticsOverview: builder.query<ApiResponse<OverviewResponse>, RangeParams | void>({
      query: (params) => ({ url: "/analytics/overview", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getParcelAnalytics: builder.query<ApiResponse<ParcelAnalyticsResponse>, RangeParams | void>({
      query: (params) => ({ url: "/analytics/parcels", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getDeliveryAnalytics: builder.query<
      ApiResponse<{
        range: unknown;
        latency: ParcelAnalyticsResponse["latency"];
        firstAttemptSuccess: number | null;
      }>,
      RangeParams | void
    >({
      query: (params) => ({ url: "/analytics/delivery", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getHubAnalytics: builder.query<
      ApiResponse<{ range: unknown; hubs: HubAnalyticsItem[] }>,
      RangeParams | void
    >({
      query: (params) => ({ url: "/analytics/hubs", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getRiderAnalytics: builder.query<
      ApiResponse<{ range: unknown; riders: RiderAnalyticsItem[]; limitations: string }>,
      RangeParams | void
    >({
      query: (params) => ({ url: "/analytics/riders", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getMyRiderAnalytics: builder.query<
      ApiResponse<{ range: unknown; rider: RiderAnalyticsItem | null }>,
      RangeParams | void
    >({
      query: (params) => ({ url: "/analytics/riders/me", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getMerchantComparison: builder.query<
      ApiResponse<{ range: unknown; merchants: MerchantCompareItem[] }>,
      RangeParams | void
    >({
      query: (params) => ({ url: "/analytics/merchants", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getRtoAnalyticsV2: builder.query<ApiResponse<RtoAnalyticsV2>, RangeParams | void>({
      query: (params) => ({ url: "/analytics/rto/v2", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getCodAnalyticsV2: builder.query<ApiResponse<CodAnalyticsV2>, RangeParams | void>({
      query: (params) => ({ url: "/analytics/cod/v2", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getFinanceAnalytics: builder.query<ApiResponse<FinanceAnalyticsResponse>, RangeParams | void>({
      query: (params) => ({ url: "/analytics/finance", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getNotificationAnalytics: builder.query<
      ApiResponse<NotificationAnalyticsResponse>,
      RangeParams | void
    >({
      query: (params) => ({ url: "/analytics/notifications", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getWebhookAnalytics: builder.query<ApiResponse<WebhookAnalyticsResponse>, RangeParams | void>({
      query: (params) => ({ url: "/analytics/webhooks", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    getIntelligenceAnalytics: builder.query<
      ApiResponse<IntelligenceAnalyticsResponse>,
      RangeParams | void
    >({
      query: (params) => ({ url: "/analytics/intelligence", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    listAlerts: builder.query<ApiResponse<AnalyticsAlert[]>, { status?: string } | void>({
      query: (params) => ({ url: "/analytics/alerts", method: "GET", params: params || {} }),
      providesTags: ["Analytics"],
    }),

    acknowledgeAlert: builder.mutation<ApiResponse<AnalyticsAlert>, string>({
      query: (id) => ({ url: `/analytics/alerts/${id}/ack`, method: "POST" }),
      invalidatesTags: ["Analytics"],
    }),

    listReports: builder.query<ApiResponse<ReportExport[]>, void>({
      query: () => "/analytics/reports",
      providesTags: ["Analytics"],
    }),

    requestReport: builder.mutation<
      ApiResponse<ReportExport>,
      { dataset: ExportDataset; format: ExportFormat; preset?: string; from?: string; to?: string }
    >({
      query: (payload) => ({ url: "/analytics/reports", method: "POST", body: payload }),
      invalidatesTags: ["Analytics"],
    }),
  }),
});

export const {
  useGetMerchantAnalyticsQuery,
  useGetOperationalAnalyticsQuery,
  useGetHubThroughputQuery,
  useGetRiderPerformanceQuery,
  useGetRtoAnalyticsQuery,
  useGetCodAnalyticsQuery,
  useGetMetricCatalogQuery,
  useGetAnalyticsOverviewQuery,
  useGetParcelAnalyticsQuery,
  useGetDeliveryAnalyticsQuery,
  useGetHubAnalyticsQuery,
  useGetRiderAnalyticsQuery,
  useGetMyRiderAnalyticsQuery,
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
  useRequestReportMutation,
} = analyticsApi;
