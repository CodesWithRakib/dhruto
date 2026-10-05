import { baseApi } from "../../../lib/api/base-api";
import { type SystemObservabilitySummary } from "@dhruto/contracts";

export const observabilityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemMetrics: builder.query<SystemObservabilitySummary, void>({
      query: () => ({
        url: "/system/metrics",
        method: "GET",
      }),
    }),
  }),
});

export const { useGetSystemMetricsQuery } = observabilityApi;
