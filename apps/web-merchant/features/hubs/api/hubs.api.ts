import { baseApi } from "../../../lib/api/base-api";
import {
  type CreateBagDto,
  type SealBagDto,
  type CreateManifestDto,
  type HubScanDto,
  type HubScanResult,
  type ApiResponse,
} from "@dhruto/contracts";

export interface HubItem {
  id: string;
  code: string;
  name: string;
  address: string;
  status: string;
}

export interface HubInventoryData {
  hub: HubItem;
  counts: {
    inboundCount: number;
    receivedCount: number;
    baggedCount: number;
    outForDeliveryCount: number;
    openBagsCount: number;
  };
  openBags: Array<{
    id: string;
    bagCode: string;
    destinationHub: string;
    status: string;
  }>;
  parcels: Array<{
    id: string;
    trackingCode: string;
    recipientName: string;
    recipientPhone: string;
    district: string;
    codAmount: number;
    status: string;
    updatedAt: string;
  }>;
}

/**
 * A transit bag as returned by the hub list endpoint.
 * Phase 2 domain — typed here so the web client never falls back to `any`.
 */
export interface BagListItem {
  id: string;
  bagCode: string;
  originHub: string | null;
  destinationHub: string | null;
  status: string;
  sealTag: string | null;
  parcelCount: number;
  sealedAt: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

/** A line-haul manifest as returned by the manifest list endpoint. */
export interface ManifestListItem {
  id: string;
  manifestCode: string;
  originHub: string | null;
  destinationHub: string | null;
  vehicleNumber: string;
  driverName: string | null;
  driverPhone: string | null;
  bagCount: number;
  status: string;
  dispatchedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export const hubsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHubs: builder.query<ApiResponse<HubItem[]>, void>({
      query: () => "/hubs",
      providesTags: ["Merchant"],
    }),
    getHubById: builder.query<ApiResponse<HubItem>, string>({
      query: (id) => `/hubs/${id}`,
    }),
    getHubInventory: builder.query<ApiResponse<HubInventoryData>, string>({
      query: (hubId) => `/hubs/${hubId}/inventory`,
      providesTags: ["Parcel"],
    }),
    scanBarcode: builder.mutation<ApiResponse<HubScanResult>, { hubId: string; scan: HubScanDto }>({
      query: ({ hubId, scan }) => ({
        url: `/hubs/${hubId}/scans`,
        method: "POST",
        body: scan,
      }),
      invalidatesTags: ["Parcel"],
    }),
    getBags: builder.query<ApiResponse<BagListItem[]>, { hubId?: string }>({
      query: (params) => {
        const qs = params?.hubId ? `?hubId=${params.hubId}` : "";
        return `/bags${qs}`;
      },
      providesTags: ["Parcel"],
    }),
    createBag: builder.mutation<ApiResponse<BagListItem>, { originHubId: string; bag: CreateBagDto }>({
      query: ({ originHubId, bag }) => ({
        url: `/bags?originHubId=${originHubId}`,
        method: "POST",
        body: bag,
      }),
      invalidatesTags: ["Parcel"],
    }),
    sealBag: builder.mutation<ApiResponse<BagListItem>, { bagId: string; seal: SealBagDto }>({
      query: ({ bagId, seal }) => ({
        url: `/bags/${bagId}/seal`,
        method: "POST",
        body: seal,
      }),
      invalidatesTags: ["Parcel"],
    }),
    dispatchBag: builder.mutation<ApiResponse<BagListItem>, string>({
      query: (bagId) => ({
        url: `/bags/${bagId}/dispatch`,
        method: "POST",
      }),
      invalidatesTags: ["Parcel"],
    }),
    receiveBag: builder.mutation<ApiResponse<BagListItem>, { bagId: string; destinationHubId: string }>({
      query: ({ bagId, destinationHubId }) => ({
        url: `/bags/${bagId}/receive`,
        method: "POST",
        body: { destinationHubId },
      }),
      invalidatesTags: ["Parcel"],
    }),
    getManifests: builder.query<ApiResponse<ManifestListItem[]>, { hubId?: string }>({
      query: (params) => {
        const qs = params?.hubId ? `?hubId=${params.hubId}` : "";
        return `/manifests${qs}`;
      },
      providesTags: ["Parcel"],
    }),
    createManifest: builder.mutation<ApiResponse<ManifestListItem>, { originHubId: string; manifest: CreateManifestDto }>({
      query: ({ originHubId, manifest }) => ({
        url: `/manifests?originHubId=${originHubId}`,
        method: "POST",
        body: manifest,
      }),
      invalidatesTags: ["Parcel"],
    }),
    dispatchManifest: builder.mutation<ApiResponse<ManifestListItem>, string>({
      query: (manifestId) => ({
        url: `/manifests/${manifestId}/dispatch`,
        method: "POST",
      }),
      invalidatesTags: ["Parcel"],
    }),
  }),
});

export const {
  useGetHubsQuery,
  useGetHubByIdQuery,
  useGetHubInventoryQuery,
  useScanBarcodeMutation,
  useGetBagsQuery,
  useCreateBagMutation,
  useSealBagMutation,
  useDispatchBagMutation,
  useReceiveBagMutation,
  useGetManifestsQuery,
  useCreateManifestMutation,
  useDispatchManifestMutation,
} = hubsApi;
