import { baseApi } from "../../../lib/api/base-api";
import {
  type GeoDatasetVersionInfo,
  type ScoringModelRecord,
  type ApiResponse,
} from "@dhruto/contracts";

export interface IntelligenceVersions {
  parserVersion: string;
  activeDataset: string;
  datasets: GeoDatasetVersionInfo[];
  models: ScoringModelRecord[];
}

export interface OverrideReviewItem {
  id: string;
  parcelId: string;
  action: string;
  overriddenBy: string | null;
  overriddenAt: string | null;
  overrideReason: string | null;
  overrideDecision: string | null;
}

export const intelligenceAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getIntelligenceVersions: builder.query<ApiResponse<IntelligenceVersions>, void>({
      query: () => "/admin/intelligence/versions",
      providesTags: ["Intelligence"],
    }),
    importGeography: builder.mutation<
      ApiResponse<{ version: string; districts: number; upazilas: number }>,
      void
    >({
      query: () => ({
        url: "/admin/intelligence/geography/import",
        method: "POST",
      }),
      invalidatesTags: ["Intelligence"],
    }),
    getIntelligenceMetrics: builder.query<ApiResponse<Record<string, number>>, void>({
      query: () => "/admin/intelligence/metrics",
      providesTags: ["Intelligence"],
    }),
    listOverrides: builder.query<ApiResponse<OverrideReviewItem[]>, void>({
      query: () => "/admin/intelligence/overrides",
      providesTags: ["Intelligence"],
    }),
  }),
});

export const {
  useGetIntelligenceVersionsQuery,
  useImportGeographyMutation,
  useGetIntelligenceMetricsQuery,
  useListOverridesQuery,
} = intelligenceAdminApi;
