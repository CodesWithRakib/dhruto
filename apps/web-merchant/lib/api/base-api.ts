import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
      const state = getState() as any;
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
  tagTypes: ["Parcel", "Merchant", "Wallet", "Auth", "Notification", "Webhook"],
  endpoints: () => ({}),
});
