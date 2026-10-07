import { baseApi } from "../../../lib/api/base-api";

export interface LoginPayload {
  emailOrPhone: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "MERCHANT";
  businessName?: string;
  pickupAddress?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  merchantId?: string;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  /**
   * The auth service nests token pairs under `tokens` on some responses.
   * Both shapes are declared so clients never need an unsafe cast.
   */
  tokens?: { accessToken?: string; refreshToken?: string };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      { data: AuthResponseData; success: boolean; message: string },
      LoginPayload
    >({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth", "Merchant", "Parcel"],
    }),
    register: builder.mutation<
      { data: AuthResponseData; success: boolean; message: string },
      RegisterPayload
    >({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth", "Merchant", "Parcel"],
    }),
    logout: builder.mutation<{ success: boolean; message: string }, { refreshToken?: string }>({
      query: (body) => ({
        url: "/auth/logout",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth", "Merchant", "Parcel"],
    }),
    getMe: builder.query<{ data: AuthUser; success: boolean }, void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useGetMeQuery } = authApi;
