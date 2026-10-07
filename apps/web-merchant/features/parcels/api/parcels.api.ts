import { baseApi } from "../../../lib/api/base-api";
import {
  type ParcelBooking,
  type ParcelCreatedResponse,
  type ParcelDetailsResponse,
  type ParcelHistoryEntry,
  type ParcelListItem,
  type ParcelStatus,
  type ShippingLabelResponse,
  type PublicTrackingResponse,
  type PricingCalculation,
  type PricingResult,
  type ApiResponse,
} from "@dhruto/contracts";

/** Server-side parcel list query. Mirrors `parcelListQuerySchema` on the API. */
export interface ParcelListParams {
  page?: number;
  limit?: number;
  sort?: "createdAt" | "updatedAt" | "codAmount" | "deliveryFee";
  order?: "ASC" | "DESC";
  status?: ParcelStatus | "";
  search?: string;
  district?: string;
  thana?: string;
  from?: string;
  to?: string;
}

/** Builds the query string without ever sending empty filters. */
function toQueryString(params: ParcelListParams): string {
  const query = new URLSearchParams();
  const assign = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "") return;
    query.set(key, String(value));
  };

  assign("page", params.page);
  assign("limit", params.limit);
  assign("sort", params.sort);
  assign("order", params.order);
  assign("status", params.status || undefined);
  assign("search", params.search?.trim() || undefined);
  assign("district", params.district?.trim() || undefined);
  assign("thana", params.thana?.trim() || undefined);
  assign("from", params.from);
  assign("to", params.to);

  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Create payload. `idempotencyKey` is mandatory: the API rejects a create
 * without `Idempotency-Key`, and the retry of a failed attempt must reuse the
 * same key so a duplicate parcel can never be created.
 */
export interface CreateParcelArgs {
  booking: ParcelBooking;
  idempotencyKey: string;
}

const PARCEL_TAG = "Parcel" as const;

export const parcelsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getParcels: builder.query<ApiResponse<ParcelListItem[]>, ParcelListParams | void>({
      query: (params) => ({
        url: `/parcels${toQueryString(params ?? {})}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.data
          ? [
              { type: PARCEL_TAG, id: "LIST" },
              ...result.data.map((parcel) => ({ type: PARCEL_TAG, id: parcel.id })),
            ]
          : [{ type: PARCEL_TAG, id: "LIST" }],
    }),

    getParcelById: builder.query<ApiResponse<ParcelDetailsResponse>, string>({
      query: (id) => ({
        url: `/parcels/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _err, id) => [{ type: PARCEL_TAG, id }],
    }),

    getParcelHistory: builder.query<ApiResponse<ParcelHistoryEntry[]>, string>({
      query: (id) => ({
        url: `/parcels/${id}/history`,
        method: "GET",
      }),
      providesTags: (_result, _err, id) => [{ type: PARCEL_TAG, id }],
    }),

    getShippingLabel: builder.query<ApiResponse<ShippingLabelResponse>, string>({
      query: (id) => ({
        url: `/parcels/${id}/label`,
        method: "GET",
      }),
      providesTags: (_result, _err, id) => [{ type: PARCEL_TAG, id }],
    }),

    getPublicTracking: builder.query<ApiResponse<PublicTrackingResponse>, string>({
      query: (trackingCode) => ({
        url: `/tracking/${encodeURIComponent(trackingCode.trim().toUpperCase())}`,
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

    createParcel: builder.mutation<ApiResponse<ParcelCreatedResponse>, CreateParcelArgs>({
      query: ({ booking, idempotencyKey }) => ({
        url: "/parcels",
        method: "POST",
        body: booking,
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      invalidatesTags: [{ type: PARCEL_TAG, id: "LIST" }, "Merchant"],
    }),
  }),
});

export const {
  useGetParcelsQuery,
  useGetParcelByIdQuery,
  useGetParcelHistoryQuery,
  useGetShippingLabelQuery,
  useGetPublicTrackingQuery,
  useCalculatePricingMutation,
  useCreateParcelMutation,
} = parcelsApi;
