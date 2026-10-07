import { baseApi } from "../../../lib/api/base-api";
import {
  type AddressParseRequest,
  type AddressParseResult,
  type AddressParseV2Request,
  type AddressParseV2Result,
  type AddressCandidate,
  type AddressConfirmationRecord,
  type AddressConfirmRequest,
  type RecipientRiskEvaluateRequest,
  type RecipientRiskResult,
  type IntelligenceRecommendation,
  type RecommendationOverrideRequest,
  type IntelligenceFeedbackInput,
  type ScoringModelRecord,
  type ApiResponse,
} from "@dhruto/contracts";

export interface ParcelIntelligence {
  parcelId: string;
  trackingCode: string;
  address: AddressParseV2Result;
  risk: {
    id: string;
    riskScore: number;
    level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
    reasons: Array<{ code: string; detail: string }>;
    riskConfidence: "HIGH" | "MEDIUM" | "LOW";
    scoringVersion: string;
    scoredAt: string;
  };
  rto: {
    id: string;
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
    reasons: Array<{ code: string; detail: string }>;
    modelType: string;
    modelVersion: string;
    predictedAt: string;
    outcome: "DELIVERED" | "RTO" | "PENDING" | null;
    outcomeAt: string | null;
  };
  recommendations: IntelligenceRecommendation[];
}

export interface IntelligenceHealth {
  parserVersion: string;
  datasetVersion: string;
  datasetSource: string;
  districts: number;
  thanas: number;
  models: ScoringModelRecord[];
  metrics: Record<string, number>;
}

export const intelligenceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    parseAddress: builder.mutation<ApiResponse<AddressParseResult>, AddressParseRequest>({
      query: (payload) => ({
        url: "/intelligence/parse-address",
        method: "POST",
        body: payload,
      }),
    }),

    evaluateRecipientRisk: builder.mutation<
      ApiResponse<RecipientRiskResult>,
      RecipientRiskEvaluateRequest
    >({
      query: (payload) => ({
        url: "/intelligence/evaluate-risk",
        method: "POST",
        body: payload,
      }),
    }),

    analyzeBooking: builder.mutation<
      ApiResponse<{ parsedAddress: AddressParseResult; riskProfile: RecipientRiskResult }>,
      RecipientRiskEvaluateRequest
    >({
      query: (payload) => ({
        url: "/intelligence/analyze-booking",
        method: "POST",
        body: payload,
      }),
    }),

    parseAddressV2: builder.mutation<ApiResponse<AddressParseV2Result>, AddressParseV2Request>({
      query: (payload) => ({
        url: "/intelligence/address/parse",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Intelligence"],
    }),

    confirmAddress: builder.mutation<ApiResponse<AddressConfirmationRecord>, AddressConfirmRequest>(
      {
        query: (payload) => ({
          url: "/intelligence/address/confirm",
          method: "POST",
          body: payload,
        }),
        invalidatesTags: ["Intelligence"],
      },
    ),

    searchGeography: builder.query<ApiResponse<AddressCandidate[]>, { q: string; limit?: number }>({
      query: ({ q, limit }) =>
        `/intelligence/geography/search?q=${encodeURIComponent(q)}&limit=${limit ?? 5}`,
      providesTags: ["Intelligence"],
    }),

    getParcelIntelligence: builder.query<ApiResponse<ParcelIntelligence>, string>({
      query: (parcelId) => `/intelligence/parcels/${parcelId}/intelligence`,
      providesTags: (_r, _e, id) => [{ type: "Intelligence", id }],
    }),

    overrideRecommendation: builder.mutation<
      ApiResponse<IntelligenceRecommendation>,
      { id: string; payload: RecommendationOverrideRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/intelligence/recommendations/${id}/override`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Intelligence"],
    }),

    acceptRecommendation: builder.mutation<ApiResponse<{ id: string }>, string>({
      query: (id) => ({
        url: `/intelligence/recommendations/${id}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["Intelligence"],
    }),

    dismissRecommendation: builder.mutation<ApiResponse<{ id: string }>, string>({
      query: (id) => ({
        url: `/intelligence/recommendations/${id}/dismiss`,
        method: "POST",
      }),
      invalidatesTags: ["Intelligence"],
    }),

    sendIntelligenceFeedback: builder.mutation<
      ApiResponse<{ id: string }>,
      IntelligenceFeedbackInput
    >({
      query: (payload) => ({
        url: "/intelligence/feedback",
        method: "POST",
        body: payload,
      }),
    }),

    listScoringModels: builder.query<ApiResponse<ScoringModelRecord[]>, void>({
      query: () => "/intelligence/models",
      providesTags: ["Intelligence"],
    }),

    getIntelligenceHealth: builder.query<ApiResponse<IntelligenceHealth>, void>({
      query: () => "/intelligence/health",
      providesTags: ["Intelligence"],
    }),
  }),
});

export const {
  useParseAddressMutation,
  useEvaluateRecipientRiskMutation,
  useAnalyzeBookingMutation,
  useParseAddressV2Mutation,
  useConfirmAddressMutation,
  useSearchGeographyQuery,
  useGetParcelIntelligenceQuery,
  useOverrideRecommendationMutation,
  useAcceptRecommendationMutation,
  useDismissRecommendationMutation,
  useSendIntelligenceFeedbackMutation,
  useListScoringModelsQuery,
  useGetIntelligenceHealthQuery,
} = intelligenceApi;
