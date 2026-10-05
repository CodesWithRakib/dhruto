import { baseApi } from "../../../lib/api/base-api";
import {
  type AnalyticsQuery,
  type MerchantAnalyticsSummary,
  type OperationalAnalyticsSummary,
  type HubThroughputMetric,
  type TopRiderMetric,
  type RtoAnalytics,
  type CodFlowAnalytics,
  type ApiResponse,
} from "@dhruto/contracts";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMerchantAnalytics: builder.query<ApiResponse<MerchantAnalyticsSummary>, AnalyticsQuery | void>({
      query: (params) => ({
        url: "/analytics/merchant/summary",
        method: "GET",
        params: params || {},
      }),
      providesTags: ["Parcel", "Wallet"],
    }),

    getOperationalAnalytics: builder.query<ApiResponse<OperationalAnalyticsSummary>, AnalyticsQuery | void>({
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
  }),
});

export const {
  useGetMerchantAnalyticsQuery,
  useGetOperationalAnalyticsQuery,
  useGetHubThroughputQuery,
  useGetRiderPerformanceQuery,
  useGetRtoAnalyticsQuery,
  useGetCodAnalyticsQuery,
} = analyticsApi;
