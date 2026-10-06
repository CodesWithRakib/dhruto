import { baseApi } from "../../../lib/api/base-api";
import {
  type AddParcelToBagDto,
  type ApiResponse,
  type BagDetails,
  type BagListItem,
  type BagStatus,
  type CreateBagDto,
  type CreateManifestDto,
  type ExceptionStatus,
  type HubScanDto,
  type HubScanResult,
  type HubScanType,
  type HubDashboard,
  type HubInventory,
  type HubSummary,
  type ManifestDetails,
  type ManifestListItem,
  type OperationalExceptionItem,
  type ParcelScanItem,
  type ReceiveManifestDto,
  type ResolveExceptionDto,
  type ScanOutcome,
  type SealBagDto,
} from "@dhruto/contracts";

/**
 * Hub operations API — Phase 2.
 * ------------------------------------------------------------------
 * Every endpoint mirrors the real backend route in
 * `apps/api/src/hubs/hubs.controller.ts`. The origin hub for a scoped
 * operation always comes from the path; the backend resolves authorization
 * from the authenticated user, never from client state.
 *
 * Cache discipline: server state lives in RTK Query under the `Hub` tag.
 * Mutations that move parcels (scan, bag, dispatch, receive) also invalidate
 * `Parcel` so merchant surfaces stay consistent without refetching the world.
 */

const HUB_TAG = "Hub" as const;
const PARCEL_TAG = "Parcel" as const;

export interface ScanListParams {
  scanType?: HubScanType;
  outcome?: ScanOutcome;
  limit?: number;
}

function toScanQuery(params: ScanListParams): string {
  const query = new URLSearchParams();
  if (params.scanType) query.set("scanType", params.scanType);
  if (params.outcome) query.set("outcome", params.outcome);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** Operational parcel lookup result — no merchant pricing or contact data. */
export interface HubParcelLookup {
  id: string;
  trackingCode: string;
  recipientName: string;
  district: string | null;
  thana: string | null;
  weightKg: number;
  status: string;
  currentHubId: string | null;
}

export const hubsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ------------------------------ Hubs ------------------------------ */
    getHubs: builder.query<ApiResponse<HubSummary[]>, void>({
      query: () => "/hubs",
      providesTags: [{ type: HUB_TAG, id: "HUB_LIST" }],
    }),
    getHubById: builder.query<ApiResponse<HubSummary>, string>({
      query: (id) => `/hubs/${id}`,
      providesTags: (_result, _error, id) => [{ type: HUB_TAG, id }],
    }),
    getDestinationHubs: builder.query<ApiResponse<HubSummary[]>, void>({
      query: () => "/hubs/destinations",
      providesTags: [{ type: HUB_TAG, id: "DESTINATIONS" }],
    }),
    getHubDashboard: builder.query<ApiResponse<HubDashboard>, string>({
      query: (hubId) => `/hubs/${hubId}/dashboard`,
      providesTags: (_result, _error, hubId) => [{ type: HUB_TAG, id: `DASHBOARD_${hubId}` }],
    }),
    getHubInventory: builder.query<ApiResponse<HubInventory>, string>({
      query: (hubId) => `/hubs/${hubId}/inventory`,
      providesTags: (_result, _error, hubId) => [{ type: HUB_TAG, id: `INVENTORY_${hubId}` }],
    }),

    /* ------------------------------ Scans ------------------------------ */
    scanBarcode: builder.mutation<
      ApiResponse<HubScanResult>,
      { hubId: string; scan: HubScanDto }
    >({
      query: ({ hubId, scan }) => ({
        url: `/hubs/${hubId}/scans`,
        method: "POST",
        body: scan,
      }),
      invalidatesTags: (_result, _error, { hubId }) => [
        { type: HUB_TAG, id: `DASHBOARD_${hubId}` },
        { type: HUB_TAG, id: `INVENTORY_${hubId}` },
        { type: HUB_TAG, id: `SCANS_${hubId}` },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),
    getScans: builder.query<
      ApiResponse<ParcelScanItem[]>,
      { hubId: string; params?: ScanListParams }
    >({
      query: ({ hubId, params }) => `/hubs/${hubId}/scans${toScanQuery(params ?? {})}`,
      providesTags: (_result, _error, { hubId }) => [{ type: HUB_TAG, id: `SCANS_${hubId}` }],
    }),
    lookupParcel: builder.query<
      ApiResponse<HubParcelLookup>,
      { hubId: string; trackingCode: string }
    >({
      query: ({ hubId, trackingCode }) =>
        `/hubs/${hubId}/parcels/${encodeURIComponent(trackingCode.trim().toUpperCase())}`,
    }),

    /* ------------------------------ Bags ------------------------------ */
    createBag: builder.mutation<
      ApiResponse<BagDetails>,
      { hubId: string; bag: CreateBagDto }
    >({
      query: ({ hubId, bag }) => ({
        url: `/hubs/${hubId}/bags`,
        method: "POST",
        body: bag,
      }),
      invalidatesTags: (_result, _error, { hubId }) => [
        { type: HUB_TAG, id: "BAG_LIST" },
        { type: HUB_TAG, id: `DASHBOARD_${hubId}` },
      ],
    }),
    getBags: builder.query<
      ApiResponse<BagListItem[]>,
      { hubId?: string; status?: BagStatus }
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.hubId) query.set("hubId", params.hubId);
        if (params?.status) query.set("status", params.status);
        const qs = query.toString();
        return `/bags${qs ? `?${qs}` : ""}`;
      },
      providesTags: [{ type: HUB_TAG, id: "BAG_LIST" }],
    }),
    getBagById: builder.query<ApiResponse<BagDetails>, string>({
      query: (id) => `/bags/${id}`,
      providesTags: (_result, _error, id) => [{ type: HUB_TAG, id: `BAG_${id}` }],
    }),
    addParcelToBag: builder.mutation<
      ApiResponse<BagDetails>,
      { bagId: string; parcel: AddParcelToBagDto }
    >({
      query: ({ bagId, parcel }) => ({
        url: `/bags/${bagId}/parcels`,
        method: "POST",
        body: parcel,
      }),
      invalidatesTags: (_result, _error, { bagId }) => [
        { type: HUB_TAG, id: "BAG_LIST" },
        { type: HUB_TAG, id: `BAG_${bagId}` },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),
    sealBag: builder.mutation<ApiResponse<BagDetails>, { bagId: string; seal: SealBagDto }>({
      query: ({ bagId, seal }) => ({
        url: `/bags/${bagId}/seal`,
        method: "POST",
        body: seal,
      }),
      invalidatesTags: (_result, _error, { bagId }) => [
        { type: HUB_TAG, id: "BAG_LIST" },
        { type: HUB_TAG, id: `BAG_${bagId}` },
      ],
    }),

    /* ---------------------------- Manifests ---------------------------- */
    createManifest: builder.mutation<
      ApiResponse<ManifestDetails>,
      { hubId: string; manifest: CreateManifestDto }
    >({
      query: ({ hubId, manifest }) => ({
        url: `/hubs/${hubId}/manifests`,
        method: "POST",
        body: manifest,
      }),
      invalidatesTags: (_result, _error, { hubId }) => [
        { type: HUB_TAG, id: `MANIFEST_LIST_${hubId}` },
        { type: HUB_TAG, id: "BAG_LIST" },
        { type: HUB_TAG, id: `DASHBOARD_${hubId}` },
      ],
    }),
    getManifests: builder.query<ApiResponse<ManifestListItem[]>, string>({
      query: (hubId) => `/hubs/${hubId}/manifests`,
      providesTags: (_result, _error, hubId) => [
        { type: HUB_TAG, id: `MANIFEST_LIST_${hubId}` },
      ],
    }),
    getManifestById: builder.query<ApiResponse<ManifestDetails>, string>({
      query: (id) => `/manifests/${id}`,
      providesTags: (_result, _error, id) => [{ type: HUB_TAG, id: `MANIFEST_${id}` }],
    }),
    dispatchManifest: builder.mutation<ApiResponse<ManifestDetails>, string>({
      query: (manifestId) => ({
        url: `/manifests/${manifestId}/dispatch`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, manifestId) => [
        { type: HUB_TAG, id: `MANIFEST_${manifestId}` },
        { type: HUB_TAG, id: "BAG_LIST" },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),
    receiveManifest: builder.mutation<
      ApiResponse<ManifestDetails>,
      { manifestId: string; receipt: ReceiveManifestDto }
    >({
      query: ({ manifestId, receipt }) => ({
        url: `/manifests/${manifestId}/receive`,
        method: "POST",
        body: receipt,
      }),
      invalidatesTags: (_result, _error, { manifestId }) => [
        { type: HUB_TAG, id: `MANIFEST_${manifestId}` },
        { type: HUB_TAG, id: "BAG_LIST" },
        { type: PARCEL_TAG, id: "LIST" },
      ],
    }),

    /* ---------------------------- Exceptions ---------------------------- */
    getExceptions: builder.query<
      ApiResponse<OperationalExceptionItem[]>,
      { hubId?: string; status?: ExceptionStatus }
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.hubId) query.set("hubId", params.hubId);
        if (params?.status) query.set("status", params.status);
        const qs = query.toString();
        return `/exceptions${qs ? `?${qs}` : ""}`;
      },
      providesTags: [{ type: HUB_TAG, id: "EXCEPTION_LIST" }],
    }),
    resolveException: builder.mutation<
      ApiResponse<OperationalExceptionItem>,
      { exceptionId: string; resolution: ResolveExceptionDto }
    >({
      query: ({ exceptionId, resolution }) => ({
        url: `/exceptions/${exceptionId}/resolve`,
        method: "POST",
        body: resolution,
      }),
      invalidatesTags: [{ type: HUB_TAG, id: "EXCEPTION_LIST" }],
    }),
  }),
});

export const {
  useGetHubsQuery,
  useGetHubByIdQuery,
  useGetDestinationHubsQuery,
  useGetHubDashboardQuery,
  useGetHubInventoryQuery,
  useScanBarcodeMutation,
  useGetScansQuery,
  useLazyLookupParcelQuery,
  useCreateBagMutation,
  useGetBagsQuery,
  useGetBagByIdQuery,
  useAddParcelToBagMutation,
  useSealBagMutation,
  useCreateManifestMutation,
  useGetManifestsQuery,
  useGetManifestByIdQuery,
  useDispatchManifestMutation,
  useReceiveManifestMutation,
  useGetExceptionsQuery,
  useResolveExceptionMutation,
} = hubsApi;
