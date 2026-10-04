import { baseApi } from "../../../lib/api/base-api";
import {
  type VerifyOtpDto,
  type CompleteDeliveryDto,
  type FailDeliveryDto,
  type CashHandInDto,
  type RiderTaskItem,
  type RiderCashSummary,
  type ApiResponse,
} from "@dhruto/contracts";

export const ridersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRiderTasks: builder.query<ApiResponse<RiderTaskItem[]>, { status?: string } | void>({
      query: (params) => {
        const qs = params?.status ? `?status=${params.status}` : "";
        return `/riders/me/tasks${qs}`;
      },
      providesTags: ["Parcel"],
    }),
    startDelivery: builder.mutation<ApiResponse<any>, string>({
      query: (parcelId) => ({
        url: `/riders/me/parcels/${parcelId}/start-delivery`,
        method: "POST",
      }),
      invalidatesTags: ["Parcel"],
    }),
    verifyOtp: builder.mutation<ApiResponse<any>, { parcelId: string; dto: VerifyOtpDto }>({
      query: ({ parcelId, dto }) => ({
        url: `/riders/me/deliveries/${parcelId}/verify-otp`,
        method: "POST",
        body: dto,
      }),
    }),
    completeDelivery: builder.mutation<ApiResponse<any>, { parcelId: string; dto: CompleteDeliveryDto }>({
      query: ({ parcelId, dto }) => ({
        url: `/riders/me/deliveries/${parcelId}/complete`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: ["Parcel"],
    }),
    failDelivery: builder.mutation<ApiResponse<any>, { parcelId: string; dto: FailDeliveryDto }>({
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
    handInCash: builder.mutation<ApiResponse<any>, CashHandInDto>({
      query: (dto) => ({
        url: "/riders/me/cash/hand-in",
        method: "POST",
        body: dto,
      }),
      invalidatesTags: ["Parcel"],
    }),
    assignParcelToRider: builder.mutation<ApiResponse<any>, { parcelId: string; riderId: string }>({
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
