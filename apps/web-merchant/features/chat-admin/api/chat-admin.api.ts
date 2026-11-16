import {
  type AdminChatInboxQuery,
  type ApiResponse,
  type ChatAdminAttachmentItem,
  type ChatAdminAttachmentPage,
  type ChatAdminConversationDetail,
  type ChatAdminMetrics,
  type ChatAttachmentDownload,
  type ChatAttachmentScanStatus,
  type ChatAuditAction,
  type ChatAuditLogPage,
  type ChatConversationDetail,
  type ChatEscalationDetail,
  type ChatInboxPage,
  type ChatInternalNoteItem,
  type ChatMessagePage,
  type ChatReportItem,
  type ChatReportPage,
  type ChatReportStatus,
  type ChatRetentionStatus,
  type ChatStaffProfile,
  type ReviewChatReportRequest,
  type UpdateChatEscalationRequest,
} from "@dhruto/contracts";
import { baseApi } from "@/lib/api/base-api";

/**
 * Admin Communication Center client (Phase 7, `/chat/admin/*`). Injected into
 * the shared `baseApi` (bearer token, refresh, session expiry).
 *
 * Reason-gated reads (conversation detail, history, attachments) carry the
 * staff reason as an argument; the backend audits every call. Those caches are
 * short-lived and never persisted. Restricted download URLs are never cached.
 */
function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error("Malformed API response");
  return response.data;
}

export type InboxArgs = Omit<
  Partial<AdminChatInboxQuery>,
  "cursor" | "hasOpenReports" | "assignedToMe"
> & {
  hasOpenReports?: boolean;
  assignedToMe?: boolean;
};

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const REASON_CACHE_SECONDS = 30;

export const chatAdminApi = baseApi
  .enhanceEndpoints({
    addTagTypes: [
      "ChatAdminInbox",
      "ChatAdminMetrics",
      "ChatAdminNotes",
      "ChatAdminEscalation",
      "ChatAdminReports",
      "ChatAdminAttachments",
      "ChatAdminAudit",
    ],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getStaffProfile: builder.query<ChatStaffProfile, void>({
        query: () => "/chat/admin/me",
        transformResponse: (r: ApiResponse<ChatStaffProfile>) => unwrap(r),
      }),

      getAdminMetrics: builder.query<ChatAdminMetrics, void>({
        query: () => "/chat/admin/metrics",
        transformResponse: (r: ApiResponse<ChatAdminMetrics>) => unwrap(r),
        providesTags: ["ChatAdminMetrics"],
      }),

      getInbox: builder.infiniteQuery<ChatInboxPage, InboxArgs, string | null>({
        infiniteQueryOptions: {
          initialPageParam: null,
          getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
        },
        query: ({ queryArg, pageParam }) =>
          `/chat/admin/inbox${qs({ ...queryArg, limit: queryArg.limit ?? 25, cursor: pageParam })}`,
        transformResponse: (r: ApiResponse<ChatInboxPage>) => unwrap(r),
        providesTags: ["ChatAdminInbox"],
      }),

      viewConversation: builder.query<ChatAdminConversationDetail, { id: string; reason: string }>({
        query: ({ id, reason }) => `/chat/admin/conversations/${id}${qs({ reason })}`,
        transformResponse: (r: ApiResponse<ChatAdminConversationDetail>) => unwrap(r),
        keepUnusedDataFor: REASON_CACHE_SECONDS,
      }),

      getAdminMessages: builder.query<
        ChatMessagePage,
        { id: string; reason: string; beforeSequence?: string }
      >({
        query: ({ id, reason, beforeSequence }) =>
          `/chat/admin/conversations/${id}/messages${qs({ reason, beforeSequence, limit: 50 })}`,
        transformResponse: (r: ApiResponse<ChatMessagePage>) => unwrap(r),
        keepUnusedDataFor: REASON_CACHE_SECONDS,
      }),

      intervene: builder.mutation<ChatConversationDetail, { id: string; reason: string }>({
        query: ({ id, reason }) => ({
          url: `/chat/admin/conversations/${id}/intervene`,
          method: "POST",
          body: { reason },
        }),
        transformResponse: (r: ApiResponse<ChatConversationDetail>) => unwrap(r),
        invalidatesTags: ["ChatAdminInbox", "ChatAdminMetrics", "ChatAdminAudit"],
      }),

      getNotes: builder.query<ChatInternalNoteItem[], string>({
        query: (id) => `/chat/admin/conversations/${id}/notes`,
        transformResponse: (r: ApiResponse<ChatInternalNoteItem[]>) => unwrap(r),
        providesTags: (_r, _e, id) => [{ type: "ChatAdminNotes", id }],
        keepUnusedDataFor: REASON_CACHE_SECONDS,
      }),

      createNote: builder.mutation<ChatInternalNoteItem, { id: string; body: string }>({
        query: ({ id, body }) => ({
          url: `/chat/admin/conversations/${id}/notes`,
          method: "POST",
          body: { body },
        }),
        transformResponse: (r: ApiResponse<ChatInternalNoteItem>) => unwrap(r),
        invalidatesTags: (_r, _e, { id }) => [{ type: "ChatAdminNotes", id }, "ChatAdminAudit"],
      }),

      getEscalation: builder.query<ChatEscalationDetail, string>({
        query: (id) => `/chat/admin/conversations/${id}/escalation`,
        transformResponse: (r: ApiResponse<ChatEscalationDetail>) => unwrap(r),
        providesTags: (_r, _e, id) => [{ type: "ChatAdminEscalation", id }],
      }),

      updateEscalation: builder.mutation<
        ChatEscalationDetail,
        { id: string; body: UpdateChatEscalationRequest }
      >({
        query: ({ id, body }) => ({
          url: `/chat/admin/conversations/${id}/escalation`,
          method: "PUT",
          body,
        }),
        transformResponse: (r: ApiResponse<ChatEscalationDetail>) => unwrap(r),
        invalidatesTags: (_r, _e, { id }) => [
          { type: "ChatAdminEscalation", id },
          "ChatAdminInbox",
          "ChatAdminMetrics",
          "ChatAdminAudit",
        ],
      }),

      getReports: builder.infiniteQuery<
        ChatReportPage,
        { status?: ChatReportStatus; conversationId?: string },
        string | null
      >({
        infiniteQueryOptions: {
          initialPageParam: null,
          getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
        },
        query: ({ queryArg, pageParam }) =>
          `/chat/admin/reports${qs({ ...queryArg, limit: 25, cursor: pageParam })}`,
        transformResponse: (r: ApiResponse<ChatReportPage>) => unwrap(r),
        providesTags: ["ChatAdminReports"],
      }),

      reviewReport: builder.mutation<ChatReportItem, { id: string; body: ReviewChatReportRequest }>(
        {
          query: ({ id, body }) => ({
            url: `/chat/admin/reports/${id}/review`,
            method: "POST",
            body,
          }),
          transformResponse: (r: ApiResponse<ChatReportItem>) => unwrap(r),
          invalidatesTags: [
            "ChatAdminReports",
            "ChatAdminInbox",
            "ChatAdminMetrics",
            "ChatAdminAudit",
          ],
        },
      ),

      /** Staff moderation path of the existing endpoint (MESSAGE_MODERATE + reason). */
      moderateMessage: builder.mutation<unknown, { messageId: string; reason: string }>({
        query: ({ messageId, reason }) => ({
          url: `/chat/messages/${messageId}/remove`,
          method: "POST",
          body: { reason },
        }),
        invalidatesTags: ["ChatAdminAudit"],
      }),

      getConversationAttachments: builder.query<
        ChatAdminAttachmentItem[],
        { id: string; reason: string }
      >({
        query: ({ id, reason }) => `/chat/admin/conversations/${id}/attachments${qs({ reason })}`,
        transformResponse: (r: ApiResponse<ChatAdminAttachmentItem[]>) => unwrap(r),
        providesTags: ["ChatAdminAttachments"],
        keepUnusedDataFor: REASON_CACHE_SECONDS,
      }),

      getAttachmentQueue: builder.infiniteQuery<
        ChatAdminAttachmentPage,
        { scanStatus?: ChatAttachmentScanStatus },
        string | null
      >({
        infiniteQueryOptions: {
          initialPageParam: null,
          getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
        },
        query: ({ queryArg, pageParam }) =>
          `/chat/admin/attachments${qs({ ...queryArg, limit: 25, cursor: pageParam })}`,
        transformResponse: (r: ApiResponse<ChatAdminAttachmentPage>) => unwrap(r),
        providesTags: ["ChatAdminAttachments"],
      }),

      /** Explicit action only; never cached (bearer URL, 5 minutes). */
      restrictedDownload: builder.query<ChatAttachmentDownload, { id: string; reason: string }>({
        query: ({ id, reason }) => `/chat/admin/attachments/${id}/download${qs({ reason })}`,
        transformResponse: (r: ApiResponse<ChatAttachmentDownload>) => unwrap(r),
        keepUnusedDataFor: 0,
      }),

      decideAttachment: builder.mutation<
        ChatAdminAttachmentItem,
        { id: string; action: "RELEASE" | "RESCAN"; reason: string }
      >({
        query: ({ id, action, reason }) => ({
          url: `/chat/admin/attachments/${id}/decision`,
          method: "POST",
          body: { action, reason },
        }),
        transformResponse: (r: ApiResponse<ChatAdminAttachmentItem>) => unwrap(r),
        invalidatesTags: ["ChatAdminAttachments", "ChatAdminMetrics", "ChatAdminAudit"],
      }),

      getRetention: builder.query<ChatRetentionStatus, void>({
        query: () => "/chat/admin/retention",
        transformResponse: (r: ApiResponse<ChatRetentionStatus>) => unwrap(r),
      }),

      getAuditLogs: builder.infiniteQuery<
        ChatAuditLogPage,
        { conversationId?: string; action?: ChatAuditAction },
        string | null
      >({
        infiniteQueryOptions: {
          initialPageParam: null,
          getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
        },
        query: ({ queryArg, pageParam }) =>
          `/chat/admin/audit-logs${qs({ ...queryArg, limit: 25, cursor: pageParam })}`,
        transformResponse: (r: ApiResponse<ChatAuditLogPage>) => unwrap(r),
        providesTags: ["ChatAdminAudit"],
      }),
    }),
  });

export const {
  useGetStaffProfileQuery,
  useGetAdminMetricsQuery,
  useGetInboxInfiniteQuery,
  useViewConversationQuery,
  useGetAdminMessagesQuery,
  useInterveneMutation,
  useGetNotesQuery,
  useCreateNoteMutation,
  useGetEscalationQuery,
  useUpdateEscalationMutation,
  useGetReportsInfiniteQuery,
  useReviewReportMutation,
  useModerateMessageMutation,
  useGetConversationAttachmentsQuery,
  useGetAttachmentQueueInfiniteQuery,
  useLazyRestrictedDownloadQuery,
  useDecideAttachmentMutation,
  useGetRetentionQuery,
  useGetAuditLogsInfiniteQuery,
} = chatAdminApi;
