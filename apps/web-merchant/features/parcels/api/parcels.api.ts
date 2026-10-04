import { baseApi } from "../../../lib/api/base-api";
import {
  type ParcelBooking,
  type ParcelCreatedResponse,
  type ApiResponse,
} from "@dhruto/contracts";

export const parcelsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createParcel: builder.mutation<ApiResponse<ParcelCreatedResponse>, ParcelBooking>({
      query: (body) => ({
        url: "/parcels",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Parcel"],
    }),
  }),
});

export const { useCreateParcelMutation } = parcelsApi;
