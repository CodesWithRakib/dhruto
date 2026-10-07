import { baseApi } from "../../../lib/api/base-api";
import {
  type NotificationItem,
  type PaginatedNotificationsResponse,
  type UnreadNotificationCountResponse,
  type NotificationPreferenceItem,
  type SupportedLocale,
  type UpdatePreferencesDto,
  type ApiResponse,
} from "@dhruto/contracts";

export interface PreferencesResponse {
  items: NotificationPreferenceItem[];
  locale: SupportedLocale;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnreadNotificationCount: builder.query<ApiResponse<UnreadNotificationCountResponse>, void>({
      query: () => "/notifications/unread-count",
      providesTags: ["Notification"],
    }),

    getMyNotifications: builder.query<
      ApiResponse<PaginatedNotificationsResponse>,
      { page?: number; limit?: number; unreadOnly?: boolean } | void
    >({
      query: (params) => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 20;
        const unreadOnly = params?.unreadOnly ?? false;
        return `/notifications/me?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`;
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

    getNotificationPreferences: builder.query<ApiResponse<PreferencesResponse>, void>({
      query: () => "/notifications/preferences",
      providesTags: ["Notification"],
    }),

    updateNotificationPreferences: builder.mutation<
      ApiResponse<PreferencesResponse>,
      UpdatePreferencesDto
    >({
      query: (payload) => ({
        url: "/notifications/preferences",
        method: "POST",
        body: payload,
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
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useTestSmsNotificationMutation,
} = notificationsApi;
