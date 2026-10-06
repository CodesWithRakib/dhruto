import { baseApi } from "../../../lib/api/base-api";
import {
  type VerifyOtpDto,
  type CompleteDeliveryDto,
  type FailDeliveryDto,
  type CashHandInDto,
  type RiderTaskItem,
  type RiderCashSummary,
  type ParcelStatus,
  type ApiResponse,
} from "@dhruto/contracts";

/**
 * Rider transition payloads (Phase 3). The body is intentionally not modelled in
 * the merchant web client: the rider terminal reacts to changes through RTK
 * Query cache tags, so consumers never read these fields. `unknown` keeps the
 * contract honest without weakening type safety.
 */
type RiderTransitionResult = unknown;

/** Response of `POST /parcels/:id/assign-rider` (Phase 1 lifecycle operation). */
export interface ParcelAssignmentResult {
  parcelId: string;
  trackingCode: string;
  riderId: string;
  status: ParcelStatus;
  message: string;
}

export const ridersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRiderTasks: builder.query<ApiResponse<RiderTaskItem[]>, { status?: string } | void>({
      query: (params) => {
        const qs = params?.status ? `?status=${params.status}` : "";
        return `/riders/me/tasks${qs}`;
      },
      providesTags: ["Parcel"],
    }),
    startDelivery: builder.mutation<ApiResponse<RiderTransitionResult>, string>({
      query: (parcelId) => ({
        url: `/riders/me/parcels/${parcelId}/start-delivery`,
        method: "POST",
      }),
      invalidatesTags: ["Parcel"],
    }),
    verifyOtp: builder.mutation<
      ApiResponse<RiderTransitionResult>,
      { parcelId: string; dto: VerifyOtpDto }
    >({
      query: ({ parcelId, dto }) => ({
        url: `/riders/me/deliveries/${parcelId}/verify-otp`,
        method: "POST",
        body: dto,
      }),
    }),
    completeDelivery: builder.mutation<
      ApiResponse<RiderTransitionResult>,
      { parcelId: string; dto: CompleteDeliveryDto }
    >({
      query: ({ parcelId, dto }) => ({
        url: `/riders/me/deliveries/${parcelId}/complete`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: ["Parcel"],
    }),
    failDelivery: builder.mutation<
      ApiResponse<RiderTransitionResult>,
      { parcelId: string; dto: FailDeliveryDto }
    >({
      query: ({ parcelId, dto }) => ({
        url: `/riders/me/deliveries/${parcelId}/fail`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: ["Parcel"],
    }),
    getCashSummary: builder.query<ApiResponse<RiderCashSummary>, void>({
      query: () => "/riders/me/cash/summary",
      providesTags: ["Parcel"],
    }),
    handInCash: builder.mutation<ApiResponse<RiderTransitionResult>, CashHandInDto>({
      query: (dto) => ({
        url: "/riders/me/cash/hand-in",
        method: "POST",
        body: dto,
      }),
      invalidatesTags: ["Parcel"],
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
      invalidatesTags: ["Parcel"],
    }),
  }),
});

export const {
  useGetRiderTasksQuery,
  useStartDeliveryMutation,
  useVerifyOtpMutation,
  useCompleteDeliveryMutation,
  useFailDeliveryMutation,
  useGetCashSummaryQuery,
  useHandInCashMutation,
  useAssignParcelToRiderMutation,
} = ridersApi;
