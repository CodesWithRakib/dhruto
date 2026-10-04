import { baseApi } from "../../../lib/api/base-api";
import {
  type WebhookSubscriptionItem,
  type WebhookDeliveryItem,
  type CreateWebhookSubscriptionDto,
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
      ApiResponse<WebhookDeliveryItem[]>,
      { limit?: number; status?: WebhookDeliveryStatus } | void
    >({
      query: (params) => {
        const limit = params?.limit ?? 50;
        const statusParam = params?.status ? `&status=${params.status}` : "";
        return `/webhooks/deliveries?limit=${limit}${statusParam}`;
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
  useDeleteWebhookSubscriptionMutation,
  usePingWebhookSubscriptionMutation,
  useListWebhookDeliveriesQuery,
  useRetryWebhookDeliveryMutation,
} = webhooksApi;
