import { baseApi } from "../../../lib/api/base-api";
import {
  type AddressParseRequest,
  type AddressParseResult,
  type RecipientRiskEvaluateRequest,
  type RecipientRiskResult,
  type ApiResponse,
} from "@dhruto/contracts";

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
  }),
});

export const {
  useParseAddressMutation,
  useEvaluateRecipientRiskMutation,
  useAnalyzeBookingMutation,
} = intelligenceApi;
