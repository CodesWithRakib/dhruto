import { baseApi } from "../../../lib/api/base-api";
import {
  type MerchantWalletData,
  type WalletTransactionItem,
  type PayoutRequestItem,
  type PendingReconciliationItem,
  type RequestPayoutDto,
  type VerifyCashLedgerDto,
  type ProcessPayoutDto,
  type ApiResponse,
} from "@dhruto/contracts";

/** Result of a hub cash verification hand-in (Phase 4 settlement domain). */
export interface CashVerificationResult {
  cashLedger: {
    id: string;
    riderId: string;
    hubId: string;
    amount: number;
    status: string;
    verifiedAt: string | null;
  };
  netSettled: number;
  newWalletBalance: number;
  message: string;
}

export interface ReconciliationSummaryData {
  totalWallets: number;
  totalMerchantBalance: number;
  totalVerifiedCod: number;
  totalPendingCod: number;
  totalDisbursedPayouts: number;
  pendingReconciliationsCount: number;
  verifiedReconciliationsCount: number;
}

export const financeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyWallet: builder.query<ApiResponse<MerchantWalletData>, void>({
      query: () => "/finance/wallet/me",
      providesTags: ["Wallet"],
    }),

    getWalletTransactions: builder.query<ApiResponse<WalletTransactionItem[]>, number | void>({
      query: (limit = 50) => `/finance/wallet/transactions?limit=${limit}`,
      providesTags: ["Wallet"],
    }),

    getMyPayouts: builder.query<ApiResponse<PayoutRequestItem[]>, void>({
      query: () => "/finance/payouts/me",
      providesTags: ["Wallet"],
    }),

    requestPayout: builder.mutation<ApiResponse<PayoutRequestItem>, RequestPayoutDto>({
      query: (payload) => ({
        url: "/finance/payouts/request",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Wallet"],
    }),

    getPendingReconciliations: builder.query<ApiResponse<PendingReconciliationItem[]>, void>({
      query: () => "/finance/reconciliation/pending",
      providesTags: ["Wallet", "Parcel"],
    }),

    verifyCashHandIn: builder.mutation<
      ApiResponse<CashVerificationResult>,
      VerifyCashLedgerDto
    >({
      query: (payload) => ({
        url: "/finance/reconciliation/verify",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Wallet", "Parcel"],
    }),

    processPayout: builder.mutation<
      ApiResponse<PayoutRequestItem>,
      { id: string; dto: ProcessPayoutDto }
    >({
      query: ({ id, dto }) => ({
        url: `/finance/payouts/${id}/process`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: ["Wallet"],
    }),

    getReconciliationSummary: builder.query<ApiResponse<ReconciliationSummaryData>, void>({
      query: () => "/finance/reconciliation/summary",
      providesTags: ["Wallet"],
    }),
  }),
});

export const {
  useGetMyWalletQuery,
  useGetWalletTransactionsQuery,
  useGetMyPayoutsQuery,
  useRequestPayoutMutation,
  useGetPendingReconciliationsQuery,
  useVerifyCashHandInMutation,
  useProcessPayoutMutation,
  useGetReconciliationSummaryQuery,
} = financeApi;
