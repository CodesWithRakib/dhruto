import {
  type ApiResponse,
  type ChatConversationDetail,
  type ChatConversationPage,
  type ChatConversationStatus,
  type ChatConversationType,
  type ChatCursorState,
  type ChatMessageItem,
  type ChatMessagePage,
  type ChatPinItem,
  type ChatReportReason,
  type ChatSearchResponse,
  type ChatUnreadSummary,
  type CreateChatConversationRequest,
  type SendChatMessageRequest,
} from "@dhruto/contracts";
import { baseApi } from "@/lib/api/base-api";

/**
 * Chat REST client (Phase 2 backend, `/chat/*`). Injected into the shared
 * `baseApi`, so it inherits the bearer token, single-flight refresh and
 * session-expiry handling. Every response is the platform envelope
 * `{ success, data }`; `unwrap` returns `data`.
 *
 * Cache ownership:
 *  - conversation list / detail / pins / search -> RTK Query cache (here);
 *  - the message timeline -> `chat-timeline.slice` (merges REST pages,
 *    realtime events and optimistic sends). History pages are fetched through
 *    `getMessages` with `subscribe: false`, so they are not cached twice.
 */
function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error("Malformed API response");
  return response.data;
}

export interface ConversationListArgs {
  type?: ChatConversationType;
  status?: ChatConversationStatus;
  unreadOnly?: boolean;
  limit?: number;
}

export interface MessageHistoryArgs {
  conversationId: string;
  beforeSequence?: string;
  afterSequence?: string;
  limit?: number;
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const chatApi = baseApi
  .enhanceEndpoints({ addTagTypes: ["ChatConversations", "ChatConversation", "ChatPins", "ChatUnread"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Get-or-create (Phase 5 contextual entry points). The backend decides
       * participants and eligibility from the parcel / merchant; the client
       * only names the context. Staff joining an existing thread must send a
       * `reason` (422 CHAT_REASON_REQUIRED otherwise).
       */
      openConversation: builder.mutation<ChatConversationDetail, CreateChatConversationRequest>({
        query: (body) => ({ url: "/chat/conversations", method: "POST", body }),
        transformResponse: (response: ApiResponse<ChatConversationDetail>) => unwrap(response),
        invalidatesTags: ["ChatConversations", "ChatUnread"],
      }),

      /** Global unread indicator (nav badge). Polled lightly; realtime invalidates it. */
      getUnreadSummary: builder.query<ChatUnreadSummary, void>({
        query: () => "/chat/conversations/unread-summary",
        transformResponse: (response: ApiResponse<ChatUnreadSummary>) => unwrap(response),
        providesTags: ["ChatUnread"],
      }),

      /** Keyset-paginated inbox (backend opaque cursor). */
      getConversations: builder.infiniteQuery<ChatConversationPage, ConversationListArgs, string | null>({
        infiniteQueryOptions: {
          initialPageParam: null,
          getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
        },
        query: ({ queryArg, pageParam }) =>
          `/chat/conversations${query({
            type: queryArg.type,
            status: queryArg.status,
            unreadOnly: queryArg.unreadOnly,
            limit: queryArg.limit ?? 20,
            cursor: pageParam ?? undefined,
          })}`,
        transformResponse: (response: ApiResponse<ChatConversationPage>) => unwrap(response),
        providesTags: ["ChatConversations"],
      }),

      getConversation: builder.query<ChatConversationDetail, string>({
        query: (id) => `/chat/conversations/${id}`,
        transformResponse: (response: ApiResponse<ChatConversationDetail>) => unwrap(response),
        providesTags: (_result, _error, id) => [{ type: "ChatConversation", id }],
      }),

      getMessages: builder.query<ChatMessagePage, MessageHistoryArgs>({
        query: ({ conversationId, beforeSequence, afterSequence, limit }) =>
          `/chat/conversations/${conversationId}/messages${query({
            beforeSequence,
            afterSequence,
            limit: limit ?? 50,
          })}`,
        transformResponse: (response: ApiResponse<ChatMessagePage>) => unwrap(response),
        keepUnusedDataFor: 0,
      }),

      getPins: builder.query<ChatPinItem[], string>({
        query: (id) => `/chat/conversations/${id}/pins`,
        transformResponse: (response: ApiResponse<ChatPinItem[]>) => unwrap(response),
        providesTags: (_result, _error, id) => [{ type: "ChatPins", id }],
      }),

      searchMessages: builder.query<ChatSearchResponse, { q: string; conversationId?: string; limit?: number }>({
        query: ({ q, conversationId, limit }) =>
          `/chat/search${query({ q, conversationId, limit: limit ?? 20 })}`,
        transformResponse: (response: ApiResponse<ChatSearchResponse>) => unwrap(response),
      }),

      /** Durable write path. `body.clientMessageId` is the idempotency key. */
      sendMessage: builder.mutation<ChatMessageItem, { conversationId: string; body: SendChatMessageRequest }>({
        query: ({ conversationId, body }) => ({
          url: `/chat/conversations/${conversationId}/messages`,
          method: "POST",
          body,
        }),
        transformResponse: (response: ApiResponse<ChatMessageItem>) => unwrap(response),
      }),

      editMessage: builder.mutation<ChatMessageItem, { messageId: string; content: string }>({
        query: ({ messageId, content }) => ({ url: `/chat/messages/${messageId}`, method: "PATCH", body: { content } }),
        transformResponse: (response: ApiResponse<ChatMessageItem>) => unwrap(response),
      }),

      deleteMessage: builder.mutation<ChatMessageItem, string>({
        query: (messageId) => ({ url: `/chat/messages/${messageId}`, method: "DELETE" }),
        transformResponse: (response: ApiResponse<ChatMessageItem>) => unwrap(response),
      }),

      /** Participant moderators (REMOVE_ANY_MESSAGE capability) only; reason required. */
      removeMessage: builder.mutation<ChatMessageItem, { messageId: string; reason: string }>({
        query: ({ messageId, reason }) => ({
          url: `/chat/messages/${messageId}/remove`,
          method: "POST",
          body: { reason },
        }),
        transformResponse: (response: ApiResponse<ChatMessageItem>) => unwrap(response),
      }),

      addReaction: builder.mutation<ChatMessageItem, { messageId: string; reaction: string }>({
        query: ({ messageId, reaction }) => ({
          url: `/chat/messages/${messageId}/reactions`,
          method: "POST",
          body: { reaction },
        }),
        transformResponse: (response: ApiResponse<ChatMessageItem>) => unwrap(response),
      }),

      removeReaction: builder.mutation<ChatMessageItem, { messageId: string; reaction: string }>({
        query: ({ messageId, reaction }) => ({
          url: `/chat/messages/${messageId}/reactions/${encodeURIComponent(reaction)}`,
          method: "DELETE",
        }),
        transformResponse: (response: ApiResponse<ChatMessageItem>) => unwrap(response),
      }),

      pinMessage: builder.mutation<ChatPinItem[], { conversationId: string; messageId: string }>({
        query: ({ conversationId, messageId }) => ({
          url: `/chat/conversations/${conversationId}/pins`,
          method: "POST",
          body: { messageId },
        }),
        transformResponse: (response: ApiResponse<ChatPinItem[]>) => unwrap(response),
        invalidatesTags: (_result, _error, { conversationId }) => [{ type: "ChatPins", id: conversationId }],
      }),

      unpinMessage: builder.mutation<ChatPinItem[], { conversationId: string; messageId: string }>({
        query: ({ conversationId, messageId }) => ({
          url: `/chat/conversations/${conversationId}/pins/${messageId}`,
          method: "DELETE",
        }),
        transformResponse: (response: ApiResponse<ChatPinItem[]>) => unwrap(response),
        invalidatesTags: (_result, _error, { conversationId }) => [{ type: "ChatPins", id: conversationId }],
      }),

      reportMessage: builder.mutation<
        { id: string; status: string },
        { messageId: string; reason: ChatReportReason; details?: string }
      >({
        query: ({ messageId, reason, details }) => ({
          url: `/chat/messages/${messageId}/reports`,
          method: "POST",
          body: details ? { reason, details } : { reason },
        }),
        transformResponse: (response: ApiResponse<{ id: string; status: string }>) => unwrap(response),
      }),

      /** REST fallback when the socket is down (sockets use `cursor:*`). */
      markRead: builder.mutation<ChatCursorState, { conversationId: string; lastReadSequence: string }>({
        query: ({ conversationId, lastReadSequence }) => ({
          url: `/chat/conversations/${conversationId}/read`,
          method: "POST",
          body: { lastReadSequence },
        }),
        transformResponse: (response: ApiResponse<ChatCursorState>) => unwrap(response),
      }),

      markDelivered: builder.mutation<ChatCursorState, { conversationId: string; lastDeliveredSequence: string }>({
        query: ({ conversationId, lastDeliveredSequence }) => ({
          url: `/chat/conversations/${conversationId}/delivered`,
          method: "POST",
          body: { lastDeliveredSequence },
        }),
        transformResponse: (response: ApiResponse<ChatCursorState>) => unwrap(response),
      }),
    }),
  });

export const {
  useOpenConversationMutation,
  useGetUnreadSummaryQuery,
  useGetConversationsInfiniteQuery,
  useGetConversationQuery,
  useGetPinsQuery,
  useSearchMessagesQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useRemoveMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  useReportMessageMutation,
} = chatApi;
