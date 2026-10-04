import { baseApi } from "../../../lib/api/base-api";
import {
  type ParcelBooking,
  type ParcelCreatedResponse,
  type ParcelDetailsResponse,
  type ShippingLabelResponse,
  type PublicTrackingResponse,
  type PricingCalculation,
  type PricingResult,
  type ApiResponse,
} from "@dhruto/contracts";

export const parcelsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getParcels: builder.query<
      ApiResponse<ParcelCreatedResponse[]>,
      { status?: string; search?: string; limit?: number } | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.set("status", params.status);
        if (params?.search) queryParams.set("search", params.search);
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        const qs = queryParams.toString();
        return {
          url: `/parcels${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Parcel"],
    }),
    getParcelById: builder.query<ApiResponse<ParcelDetailsResponse>, string>({
      query: (id) => ({
        url: `/parcels/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _err, id) => [{ type: "Parcel", id }],
    }),
    getShippingLabel: builder.query<ApiResponse<ShippingLabelResponse>, string>({
      query: (id) => ({
        url: `/parcels/${id}/label`,
        method: "GET",
      }),
    }),
    getPublicTracking: builder.query<ApiResponse<PublicTrackingResponse>, string>({
      query: (trackingCode) => ({
        url: `/tracking/${trackingCode}`,
        method: "GET",
      }),
    }),
    calculatePricing: builder.mutation<ApiResponse<PricingResult>, PricingCalculation>({
      query: (body) => ({
        url: "/pricing/calculate",
        method: "POST",
        body,
      }),
    }),
    createParcel: builder.mutation<
      ApiResponse<ParcelCreatedResponse>,
      { booking: ParcelBooking; idempotencyKey?: string } | ParcelBooking
    >({
      query: (arg) => {
        const isWrapped = "booking" in arg;
        const booking = isWrapped ? (arg as { booking: ParcelBooking }).booking : arg;
        const idempotencyKey = isWrapped ? (arg as { idempotencyKey?: string }).idempotencyKey : undefined;
        const headers: Record<string, string> = {};
        if (idempotencyKey) {
          headers["Idempotency-Key"] = idempotencyKey;
        }
        return {
          url: "/parcels",
          method: "POST",
          body: booking,
          headers,
        };
      },
      invalidatesTags: ["Parcel", "Merchant"],
    }),
  }),
});

export const {
  useGetParcelsQuery,
  useGetParcelByIdQuery,
  useGetShippingLabelQuery,
  useGetPublicTrackingQuery,
  useCalculatePricingMutation,
  useCreateParcelMutation,
} = parcelsApi;
