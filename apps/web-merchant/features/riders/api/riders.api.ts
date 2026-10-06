import { baseApi } from "../../../lib/api/base-api";
import {
  type ApiResponse,
  type CashHandInDto,
  type CompleteDeliveryDto,
  type CompleteDeliveryResult,
  type FailDeliveryDto,
  type FailDeliveryResult,
  type ParcelAssignmentResult,
  type ParcelStatus,
  type RequestOtpResult,
  type RiderCashSummary,
  type RiderDashboard,
  type RiderDetails,
  type RiderHistoryItem,
  type RiderListItem,
  type RiderProfile,
  type RiderTaskDetails,
  type RiderTaskItem,
  type SetDutyDto,
  type StartDeliveryResult,
  type VerifyOtpDto,
  type VerifyOtpResult,
} from "@dhruto/contracts";

/**
 * Rider delivery API — Phase 3.
 * ------------------------------------------------------------------
 * Mirrors `apps/api/src/riders/riders.controller.ts` (terminal) and the
 * hub/admin fleet endpoints. Server state lives under the `Rider` tag so
 * delivery commands never bust the merchant parcel cache; commands that move
 * parcels also invalidate `Parcel` for cross-surface consistency.
 */

const RIDER_TAG = "Rider" as const;
const PARCEL_TAG = "Parcel" as const;

export interface RiderHistoryParams {
  page?: number;
  limit?: number;
  status?: ParcelStatus;
}

function toHistoryQuery(params: RiderHistoryParams): string {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const ridersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ------------------------- Rider terminal ------------------------- */
    getRiderDashboard: builder.query<ApiResponse<RiderDashboard>, void>({
      query: () => "/riders/me/dashboard",
      providesTags: [{ type: RIDER_TAG, id: "DASHBOARD" }],
    }),
    getRiderTasks: builder.query<ApiResponse<RiderTaskItem[]>, { status?: string } | void>({
      query: (params) => {
        const qs = params?.status ? `?status=${params.status}` : "";
        return `/riders/me/tasks${qs}`;
      },
      providesTags: [{ type: RIDER_TAG, id: "TASK_LIST" }],
    }),
    getRiderTaskDetails: builder.query<ApiResponse<RiderTaskDetails>, string>({
      query: (parcelId) => `/riders/me/tasks/${parcelId}`,
      providesTags: (_result, _error, parcelId) => [{ type: RIDER_TAG, id: `TASK_${parcelId}` }],
    }),
    getRiderHistory: builder.query<
      ApiResponse<{ items: RiderHistoryItem[]; total: number; page: number; limit: number }>,
      RiderHistoryParams | void
    >({
      query: (params) => `/riders/me/history${toHistoryQuery(params ?? {})}`,
      providesTags: [{ type: RIDER_TAG, id: "HISTORY" }],
    }),
    getRiderProfile: builder.query<ApiResponse<RiderProfile>, void>({
      query: () => "/riders/me/profile",
      providesTags: [{ type: RIDER_TAG, id: "PROFILE" }],
    }),
    setDuty: builder.mutation<ApiResponse<RiderProfile>, SetDutyDto>({
      query: (dto) => ({ url: "/riders/me/duty", method: "POST", body: dto }),
      invalidatesTags: [
        { type: RIDER_TAG, id: "PROFILE" },
        { type: RIDER_TAG, id: "DASHBOARD" },
      ],
    }),
    startDelivery: builder.mutation<ApiResponse<StartDeliveryResult>, string>({
      query: (parcelId) => ({
        url: `/riders/me/parcels/${parcelId}/start-delivery`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, parcelId) => [
        { type: RIDER_TAG, id: "TASK_LIST" },
        { type: RIDER_TAG, id: `TASK_${parcelId}` },
        { type: RIDER_TAG, id: "DASHBOARD" },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),
    requestOtp: builder.mutation<ApiResponse<RequestOtpResult>, string>({
      query: (parcelId) => ({
        url: `/riders/me/deliveries/${parcelId}/otp`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: (_result, _error, parcelId) => [
        { type: RIDER_TAG, id: `TASK_${parcelId}` },
      ],
    }),
    verifyOtp: builder.mutation<
      ApiResponse<VerifyOtpResult>,
      { parcelId: string; dto: VerifyOtpDto }
    >({
      query: ({ parcelId, dto }) => ({
        url: `/riders/me/deliveries/${parcelId}/verify-otp`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: (_result, _error, { parcelId }) => [
        { type: RIDER_TAG, id: `TASK_${parcelId}` },
      ],
    }),
    completeDelivery: builder.mutation<
      ApiResponse<CompleteDeliveryResult>,
      { parcelId: string; dto: CompleteDeliveryDto; idempotencyKey: string }
    >({
      query: ({ parcelId, dto, idempotencyKey }) => ({
        url: `/riders/me/deliveries/${parcelId}/complete`,
        method: "POST",
        body: dto,
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      invalidatesTags: (_result, _error, { parcelId }) => [
        { type: RIDER_TAG, id: "TASK_LIST" },
        { type: RIDER_TAG, id: `TASK_${parcelId}` },
        { type: RIDER_TAG, id: "DASHBOARD" },
        { type: RIDER_TAG, id: "HISTORY" },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),
    failDelivery: builder.mutation<
      ApiResponse<FailDeliveryResult>,
      { parcelId: string; dto: FailDeliveryDto }
    >({
      query: ({ parcelId, dto }) => ({
        url: `/riders/me/deliveries/${parcelId}/fail`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: (_result, _error, { parcelId }) => [
        { type: RIDER_TAG, id: "TASK_LIST" },
        { type: RIDER_TAG, id: `TASK_${parcelId}` },
        { type: RIDER_TAG, id: "DASHBOARD" },
        { type: RIDER_TAG, id: "HISTORY" },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),
    getCashSummary: builder.query<ApiResponse<RiderCashSummary>, void>({
      query: () => "/riders/me/cash/summary",
      providesTags: [{ type: RIDER_TAG, id: "CASH" }],
    }),
    handInCash: builder.mutation<
      ApiResponse<{ handinId: string | null; handinCode: string | null }>,
      { dto: CashHandInDto; idempotencyKey: string }
    >({
      query: ({ dto, idempotencyKey }) => ({
        url: "/riders/me/cash/hand-in",
        method: "POST",
        body: dto,
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      invalidatesTags: [
        { type: RIDER_TAG, id: "CASH" },
        { type: RIDER_TAG, id: "DASHBOARD" },
      ],
    }),
    getCashHandIns: builder.query<ApiResponse<import("@dhruto/contracts").CashHandInBatchItem[]>, void>({
      query: () => "/riders/me/cash/handins",
      providesTags: [{ type: RIDER_TAG, id: "CASH" }],
    }),

    /* --------------------- Hub/admin fleet operations --------------------- */
    getFleetRiders: builder.query<ApiResponse<RiderListItem[]>, { hubId?: string } | void>({
      query: (params) => {
        const qs = params?.hubId ? `?hubId=${params.hubId}` : "";
        return `/riders${qs}`;
      },
      providesTags: [{ type: RIDER_TAG, id: "FLEET" }],
    }),
    getFleetRider: builder.query<ApiResponse<RiderDetails>, string>({
      query: (id) => `/riders/${id}`,
      providesTags: (_result, _error, id) => [{ type: RIDER_TAG, id: `FLEET_${id}` }],
    }),
    assignParcelToRider: builder.mutation<
      ApiResponse<ParcelAssignmentResult>,
      { parcelId: string; riderId: string }
    >({
      query: ({ parcelId, riderId }) => ({
        url: `/parcels/${parcelId}/assign-rider`,
        method: "POST",
        body: { riderId },
      }),
      invalidatesTags: [
        { type: RIDER_TAG, id: "FLEET" },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetRiderDashboardQuery,
  useGetRiderTasksQuery,
  useGetRiderTaskDetailsQuery,
  useGetRiderHistoryQuery,
  useGetRiderProfileQuery,
  useSetDutyMutation,
  useStartDeliveryMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useCompleteDeliveryMutation,
  useFailDeliveryMutation,
  useGetCashSummaryQuery,
  useHandInCashMutation,
  useGetCashHandInsQuery,
  useGetFleetRidersQuery,
  useGetFleetRiderQuery,
  useAssignParcelToRiderMutation,
} = ridersApi;
