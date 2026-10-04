import { baseApi } from "../../../lib/api/base-api";
import {
  type NotificationItem,
  type UnreadNotificationCountResponse,
  type ApiResponse,
} from "@dhruto/contracts";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnreadNotificationCount: builder.query<ApiResponse<UnreadNotificationCountResponse>, void>({
      query: () => "/notifications/unread-count",
      providesTags: ["Notification"],
    }),

    getMyNotifications: builder.query<
      ApiResponse<NotificationItem[]>,
      { limit?: number; unreadOnly?: boolean } | void
    >({
      query: (params) => {
        const limit = params?.limit ?? 20;
        const unreadOnly = params?.unreadOnly ?? false;
        return `/notifications/me?limit=${limit}&unreadOnly=${unreadOnly}`;
      },
      providesTags: ["Notification"],
    }),

    markNotificationAsRead: builder.mutation<ApiResponse<NotificationItem>, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),

    markAllNotificationsAsRead: builder.mutation<ApiResponse<{ updatedCount: number }>, void>({
      query: () => ({
        url: "/notifications/read-all",
        method: "POST",
      }),
      invalidatesTags: ["Notification"],
    }),

    testSmsNotification: builder.mutation<
      ApiResponse<NotificationItem>,
      { phone: string; message: string }
    >({
      query: (payload) => ({
        url: "/notifications/test-sms",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetUnreadNotificationCountQuery,
  useGetMyNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useTestSmsNotificationMutation,
} = notificationsApi;
