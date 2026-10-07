import { baseApi } from "../../../lib/api/base-api";
import {
  type WebhookSubscriptionItem,
  type WebhookDeliveryItem,
  type WebhookSecretRotationResult,
  type CreateWebhookSubscriptionDto,
  type UpdateWebhookSubscriptionDto,
  type WebhookDeliveryStatus,
  type ApiResponse,
} from "@dhruto/contracts";

export const webhooksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listWebhookSubscriptions: builder.query<ApiResponse<WebhookSubscriptionItem[]>, void>({
      query: () => "/webhooks/subscriptions",
      providesTags: ["Webhook"],
    }),

    createWebhookSubscription: builder.mutation<
      ApiResponse<WebhookSubscriptionItem>,
      CreateWebhookSubscriptionDto
    >({
      query: (payload) => ({
        url: "/webhooks/subscriptions",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Webhook"],
    }),

    updateWebhookSubscription: builder.mutation<
      ApiResponse<WebhookSubscriptionItem>,
      { id: string; payload: UpdateWebhookSubscriptionDto }
    >({
      query: ({ id, payload }) => ({
        url: `/webhooks/subscriptions/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["Webhook"],
    }),

    rotateWebhookSecret: builder.mutation<ApiResponse<WebhookSecretRotationResult>, string>({
      query: (id) => ({
        url: `/webhooks/subscriptions/${id}/rotate-secret`,
        method: "POST",
      }),
      invalidatesTags: ["Webhook"],
    }),

    deleteWebhookSubscription: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/webhooks/subscriptions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Webhook"],
    }),

    pingWebhookSubscription: builder.mutation<ApiResponse<WebhookDeliveryItem>, string>({
      query: (id) => ({
        url: `/webhooks/subscriptions/${id}/ping`,
        method: "POST",
      }),
      invalidatesTags: ["Webhook"],
    }),

    listWebhookDeliveries: builder.query<
      ApiResponse<{ items: WebhookDeliveryItem[]; total: number; page: number; limit: number }>,
      { page?: number; limit?: number; status?: WebhookDeliveryStatus } | void
    >({
      query: (params) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 50;
        const statusParam = params?.status ? `&status=${params.status}` : "";
        return `/webhooks/deliveries?page=${page}&limit=${limit}${statusParam}`;
      },
      providesTags: ["Webhook"],
    }),

    retryWebhookDelivery: builder.mutation<ApiResponse<WebhookDeliveryItem>, string>({
      query: (id) => ({
        url: `/webhooks/deliveries/${id}/retry`,
        method: "POST",
      }),
      invalidatesTags: ["Webhook"],
    }),
  }),
});

export const {
  useListWebhookSubscriptionsQuery,
  useCreateWebhookSubscriptionMutation,
  useUpdateWebhookSubscriptionMutation,
  useRotateWebhookSecretMutation,
  useDeleteWebhookSubscriptionMutation,
  usePingWebhookSubscriptionMutation,
  useListWebhookDeliveriesQuery,
  useRetryWebhookDeliveryMutation,
} = webhooksApi;
