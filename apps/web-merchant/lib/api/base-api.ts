import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Structural view of the slice the API client needs.
 *
 * Declared locally (instead of importing `RootState`) because the store imports
 * this module — a real type import here would be a circular dependency.
 */
interface ApiAuthState {
  auth?: { accessToken?: string | null };
}

const getBaseUrl = (): string => {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://localhost:4000/api/v1";
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json");

      // Retrieve auth token from state or localStorage
      const state = getState() as ApiAuthState;
      let token: string | null = state?.auth?.accessToken || null;
      if (!token && typeof window !== "undefined") {
        const stored = localStorage.getItem("dhruto_access_token");
        if (stored && stored !== "undefined" && stored !== "null") {
          token = stored.replace(/^["']|["']$/g, "").trim();
        }
      }

      if (token && token !== "undefined" && token !== "null") {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["Parcel", "Merchant", "Wallet", "Auth", "Notification", "Webhook", "Hub", "Rider", "Finance"],
  endpoints: () => ({}),
});
