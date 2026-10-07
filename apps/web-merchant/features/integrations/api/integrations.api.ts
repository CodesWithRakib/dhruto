import { baseApi } from "../../../lib/api/base-api";
import {
  type IntegrationFailureItem,
  type IntegrationFailureStatus,
  type IntegrationOverview,
  type OutboxItem,
  type QueueHealthItem,
  type ApiResponse,
} from "@dhruto/contracts";

export interface FailuresPage {
  items: IntegrationFailureItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OutboxOverview {
  stats: {
    pending: number;
    failed: number;
    publishedLastHour: number;
    oldestPendingAgeMs: number | null;
  };
  failed: OutboxItem[];
}

export const integrationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getIntegrationOverview: builder.query<ApiResponse<IntegrationOverview>, void>({
      query: () => "/admin/integrations/overview",
      providesTags: ["Integration"],
    }),
    getQueueHealth: builder.query<ApiResponse<QueueHealthItem[]>, void>({
      query: () => "/admin/integrations/queues",
      providesTags: ["Integration"],
    }),
    listIntegrationFailures: builder.query<
      ApiResponse<FailuresPage>,
      { queue?: string; status?: IntegrationFailureStatus; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.queue) search.set("queue", params.queue);
        if (params?.status) search.set("status", params.status);
        search.set("page", String(params?.page ?? 1));
        search.set("limit", String(params?.limit ?? 50));
        return `/admin/integrations/failures?${search.toString()}`;
      },
      providesTags: ["Integration"],
    }),
    replayIntegrationFailure: builder.mutation<ApiResponse<IntegrationFailureItem>, string>({
      query: (id) => ({
        url: `/admin/integrations/failures/${id}/replay`,
        method: "POST",
      }),
      invalidatesTags: ["Integration", "Webhook"],
    }),
    resolveIntegrationFailure: builder.mutation<ApiResponse<IntegrationFailureItem>, string>({
      query: (id) => ({
        url: `/admin/integrations/failures/${id}/resolve`,
        method: "POST",
      }),
      invalidatesTags: ["Integration"],
    }),
    getOutboxOverview: builder.query<ApiResponse<OutboxOverview>, void>({
      query: () => "/admin/integrations/outbox",
      providesTags: ["Integration"],
    }),
    replayOutboxEvent: builder.mutation<ApiResponse<{ id: string; status: string }>, string>({
      query: (id) => ({
        url: `/admin/integrations/outbox/${id}/replay`,
        method: "POST",
      }),
      invalidatesTags: ["Integration"],
    }),
  }),
});

export const {
  useGetIntegrationOverviewQuery,
  useGetQueueHealthQuery,
  useListIntegrationFailuresQuery,
  useReplayIntegrationFailureMutation,
  useResolveIntegrationFailureMutation,
  useGetOutboxOverviewQuery,
  useReplayOutboxEventMutation,
} = integrationsApi;
