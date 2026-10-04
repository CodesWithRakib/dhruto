import { baseApi } from "../../../lib/api/base-api";

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  inTransitOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  totalCodAmount: number;
  collectedCodAmount: number;
  totalDeliveryFees: number;
}

export interface MerchantDashboardData {
  merchant: {
    id: string;
    businessName: string;
    contactPhone: string;
    pickupAddress: string;
    status: string;
  };
  stats: DashboardStats;
  recentParcels: Array<{
    id: string;
    trackingCode: string;
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;
    district: string;
    codAmount: number;
    deliveryFee: number;
    status: string;
    createdAt: string;
  }>;
}

export const merchantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMerchantProfile: builder.query<{ data: any; success: boolean }, void>({
      query: () => "/merchants/me",
      providesTags: ["Merchant"],
    }),
    updateMerchantProfile: builder.mutation<
      { data: any; success: boolean; message: string },
      { businessName?: string; contactPhone?: string; pickupAddress?: string }
    >({
      query: (body) => ({
        url: "/merchants/me",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Merchant"],
    }),
    getMerchantDashboard: builder.query<{ data: MerchantDashboardData; success: boolean }, void>({
      query: () => "/merchants/me/dashboard",
      providesTags: ["Merchant", "Parcel"],
    }),
  }),
});

export const {
  useGetMerchantProfileQuery,
  useUpdateMerchantProfileMutation,
  useGetMerchantDashboardQuery,
} = merchantsApi;
