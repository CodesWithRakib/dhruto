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

/** Bulk import row. Server validates each row like a single booking. */
export interface BulkBookingRow {
  recipientName: string;
  recipientPhone: string;
  district: string;
  thana: string;
  deliveryAddress: string;
  parcelDescription?: string;
  codAmount: number;
  weight: number;
}

export interface BulkRowResult {
  index: number;
  ok: boolean;
  parcelId?: string;
  trackingCode?: string;
  errorCode?: string;
  message?: string;
}

export interface BulkImportResult {
  total: number;
  created: number;
  failed: number;
  rows: BulkRowResult[];
}

export interface BulkPreviewRow {
  index: number;
  ok: boolean;
  deliveryFee?: number;
  zone?: string;
  message?: string;
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

    getBulkTemplate: builder.query<
      ApiResponse<{ columns: string[]; maxRows: number; csvHeader: string; sample: string }>,
      void
    >({
      query: () => ({ url: "/parcels/bulk/template", method: "GET" }),
    }),

    validateBulk: builder.mutation<
      ApiResponse<{ total: number; quotable: number; rows: BulkPreviewRow[] }>,
      { rows: BulkBookingRow[] }
    >({
      query: (body) => ({ url: "/parcels/bulk/validate", method: "POST", body }),
    }),

    importBulk: builder.mutation<
      ApiResponse<BulkImportResult>,
      { rows: BulkBookingRow[]; idempotencyKey: string }
    >({
      query: ({ rows, idempotencyKey }) => ({
        url: "/parcels/bulk/import",
        method: "POST",
        body: { rows },
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      invalidatesTags: [{ type: PARCEL_TAG, id: "LIST" }, "Merchant"],
    }),

    cancelParcel: builder.mutation<
      ApiResponse<{ parcelId: string; trackingCode: string; status: ParcelStatus }>,
      string
    >({
      query: (id) => ({
        url: `/parcels/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: PARCEL_TAG, id },
        { type: PARCEL_TAG, id: "LIST" },
        "Merchant",
      ],
    }),

    updateParcel: builder.mutation<
      ApiResponse<ParcelDetailsResponse>,
      {
        id: string;
        data: {
          recipientName?: string;
          recipientPhone?: string;
          deliveryAddress?: string;
          notes?: string;
        };
      }
    >({
      query: ({ id, data }) => ({
        url: `/parcels/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: PARCEL_TAG, id },
        { type: PARCEL_TAG, id: "LIST" },
      ],
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
  useGetBulkTemplateQuery,
  useValidateBulkMutation,
  useImportBulkMutation,
  useCancelParcelMutation,
  useUpdateParcelMutation,
} = parcelsApi;

