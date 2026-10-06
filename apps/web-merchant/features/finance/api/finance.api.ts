import { baseApi } from "../../../lib/api/base-api";
import {
  type CashDiscrepancyItem,
  type CashHandInBatchItem,
  type CreateAdjustmentDto,
  type CreateSettlementBatchDto,
  type FinancialTransactionItem,
  type FinancialTransactionStatus,
  type FinancialTransactionType,
  type MerchantWalletData,
  type PayoutRequestItem,
  type PayoutStatus,
  type PendingReconciliationItem,
  type ProcessPayoutDto,
  type RequestPayoutDto,
  type ResolveDiscrepancyDto,
  type SettlementBatchItem,
  type SettlementBatchStatus,
  type SettlementItem,
  type SettlementStatus,
  type VerifyCashLedgerDto,
  type WalletTransactionItem,
  type WalletTransactionType,
  type ApiResponse,
} from "@dhruto/contracts";

/**
 * Finance API — Phase 4.
 * ------------------------------------------------------------------
 * Merchant wallet/statement/settlements/payouts, hub cash verification and
 * the admin finance surface. Money moves only server-side; every mutation
 * that moves funds carries an idempotency key generated once per user
 * action. Account numbers arriving from the server are already masked.
 */

const FINANCE_TAG = "Finance" as const;
const WALLET_TAG = "Wallet" as const;

export interface CashVerificationResult {
  cashLedger: {
    id: string;
    handInStatus: string;
    verifiedAmount: number | null;
  };
  settlementCode: string;
  netSettled: number;
  newWalletBalance: number;
  discrepancyId: string | null;
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
  openDiscrepanciesCount: number;
}

export interface PageArgs {
  page?: number;
  limit?: number;
}

function toPageQuery<T extends object>(params: T): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const financeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ------------------------- Merchant wallet ------------------------- */
    getMyWallet: builder.query<ApiResponse<MerchantWalletData>, void>({
      query: () => "/finance/wallet/me",
      providesTags: [WALLET_TAG],
    }),

    getWalletTransactions: builder.query<
      ApiResponse<WalletTransactionItem[]>,
      { page?: number; limit?: number; type?: WalletTransactionType } | void
    >({
      query: (params) => `/finance/wallet/transactions${toPageQuery((params ?? {}) as Record<string, unknown>)}`,
      providesTags: [WALLET_TAG],
    }),

    getMyPayouts: builder.query<ApiResponse<PayoutRequestItem[]>, void>({
      query: () => "/finance/payouts/me",
      providesTags: [WALLET_TAG],
    }),

    getMyPayout: builder.query<ApiResponse<PayoutRequestItem>, string>({
      query: (id) => `/finance/payouts/${id}`,
      providesTags: (_result, _error, id) => [{ type: WALLET_TAG, id }],
    }),

    requestPayout: builder.mutation<
      ApiResponse<PayoutRequestItem>,
      { dto: RequestPayoutDto; idempotencyKey: string }
    >({
      query: ({ dto, idempotencyKey }) => ({
        url: "/finance/payouts/request",
        method: "POST",
        body: dto,
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      invalidatesTags: [WALLET_TAG],
    }),

    cancelPayout: builder.mutation<ApiResponse<PayoutRequestItem>, string>({
      query: (id) => ({ url: `/finance/payouts/${id}/cancel`, method: "POST" }),
      invalidatesTags: [WALLET_TAG],
    }),

    getMySettlements: builder.query<
      ApiResponse<{ items: SettlementItem[]; total: number; page: number; limit: number }>,
      PageArgs | void
    >({
      query: (params) => `/finance/settlements/me${toPageQuery(params ?? {})}`,
      providesTags: [WALLET_TAG],
    }),

    getMySettlement: builder.query<ApiResponse<SettlementItem>, string>({
      query: (id) => `/finance/settlements/${id}`,
    }),

    /* --------------------------- Hub cash --------------------------- */
    getPendingReconciliations: builder.query<ApiResponse<PendingReconciliationItem[]>, void>({
      query: () => "/finance/reconciliation/pending",
      providesTags: [FINANCE_TAG, "Parcel"],
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
      invalidatesTags: [FINANCE_TAG, "Parcel", WALLET_TAG],
    }),

    getHubHandIns: builder.query<ApiResponse<CashHandInBatchItem[]>, { status?: string } | void>({
      query: (params) => {
        const qs = params?.status ? `?status=${params.status}` : "";
        return `/finance/cash-handins${qs}`;
      },
      providesTags: [FINANCE_TAG],
    }),

    getDiscrepancies: builder.query<ApiResponse<CashDiscrepancyItem[]>, { status?: string } | void>({
      query: (params) => {
        const qs = params?.status ? `?status=${params.status}` : "";
        return `/finance/discrepancies${qs}`;
      },
      providesTags: [FINANCE_TAG],
    }),

    getReconciliationSummary: builder.query<ApiResponse<ReconciliationSummaryData>, void>({
      query: () => "/finance/reconciliation/summary",
      providesTags: [FINANCE_TAG],
    }),

    /* --------------------------- Admin --------------------------- */
    getFinanceOverview: builder.query<ApiResponse<ReconciliationSummaryData>, void>({
      query: () => "/admin/finance/overview",
      providesTags: [FINANCE_TAG],
    }),

    getAdminPayouts: builder.query<
      ApiResponse<{ items: PayoutRequestItem[]; total: number; page: number; limit: number }>,
      PageArgs & { merchantId?: string; status?: PayoutStatus }
    >({
      query: (params) => `/admin/finance/payouts${toPageQuery(params)}`,
      providesTags: [FINANCE_TAG],
    }),

    approvePayout: builder.mutation<ApiResponse<PayoutRequestItem>, { id: string; notes?: string }>({
      query: ({ id, notes }) => ({
        url: `/admin/finance/payouts/${id}/approve`,
        method: "POST",
        body: notes ? { notes } : {},
      }),
      invalidatesTags: [FINANCE_TAG],
    }),

    processPayout: builder.mutation<
      ApiResponse<PayoutRequestItem>,
      { id: string; dto: ProcessPayoutDto }
    >({
      query: ({ id, dto }) => ({
        url: `/admin/finance/payouts/${id}/process`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: [FINANCE_TAG, WALLET_TAG],
    }),

    getAdminSettlements: builder.query<
      ApiResponse<{ items: SettlementItem[]; total: number; page: number; limit: number }>,
      PageArgs & { merchantId?: string; status?: SettlementStatus }
    >({
      query: (params) => `/admin/finance/settlements${toPageQuery(params)}`,
      providesTags: [FINANCE_TAG],
    }),

    createSettlementBatch: builder.mutation<
      ApiResponse<SettlementBatchItem>,
      CreateSettlementBatchDto
    >({
      query: (dto) => ({ url: "/admin/finance/settlements/batches", method: "POST", body: dto }),
      invalidatesTags: [FINANCE_TAG],
    }),

    getSettlementBatches: builder.query<
      ApiResponse<{ items: SettlementBatchItem[]; total: number; page: number; limit: number }>,
      PageArgs & { merchantId?: string; status?: SettlementBatchStatus }
    >({
      query: (params) => `/admin/finance/settlements/batches${toPageQuery(params)}`,
      providesTags: [FINANCE_TAG],
    }),

    completeSettlementBatch: builder.mutation<ApiResponse<SettlementBatchItem>, string>({
      query: (id) => ({ url: `/admin/finance/settlements/batches/${id}/complete`, method: "POST" }),
      invalidatesTags: [FINANCE_TAG],
    }),

    resolveDiscrepancy: builder.mutation<
      ApiResponse<{ id: string; status: string }>,
      { id: string; dto: ResolveDiscrepancyDto }
    >({
      query: ({ id, dto }) => ({
        url: `/admin/finance/discrepancies/${id}/resolve`,
        method: "POST",
        body: dto,
      }),
      invalidatesTags: [FINANCE_TAG, WALLET_TAG],
    }),

    createAdjustment: builder.mutation<
      ApiResponse<FinancialTransactionItem>,
      { dto: CreateAdjustmentDto; idempotencyKey: string }
    >({
      query: ({ dto, idempotencyKey }) => ({
        url: "/admin/finance/adjustments",
        method: "POST",
        body: dto,
        headers: { "Idempotency-Key": idempotencyKey },
      }),
      invalidatesTags: [FINANCE_TAG, WALLET_TAG],
    }),

    reverseTransaction: builder.mutation<
      ApiResponse<FinancialTransactionItem>,
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/admin/finance/transactions/${id}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: [FINANCE_TAG, WALLET_TAG],
    }),

    getJournalTransactions: builder.query<
      ApiResponse<{ items: FinancialTransactionItem[]; total: number; page: number; limit: number }>,
      PageArgs & { type?: FinancialTransactionType; status?: FinancialTransactionStatus }
    >({
      query: (params) => `/admin/finance/transactions${toPageQuery(params)}`,
      providesTags: [FINANCE_TAG],
    }),

    getJournalTransaction: builder.query<ApiResponse<FinancialTransactionItem>, string>({
      query: (id) => `/admin/finance/transactions/${id}`,
    }),

    getCodReport: builder.query<
      ApiResponse<{ items: Record<string, unknown>[]; total: number; page: number; limit: number }>,
      PageArgs & { from?: string; to?: string; merchantId?: string; hubId?: string; riderId?: string }
    >({
      query: (params) => `/admin/finance/reports/cod${toPageQuery(params)}`,
      providesTags: [FINANCE_TAG],
    }),

    getFeeReport: builder.query<
      ApiResponse<{ items: Record<string, unknown>[] }>,
      { from?: string; to?: string } | void
    >({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.from) query.set("from", params.from);
        if (params?.to) query.set("to", params.to);
        const qs = query.toString();
        return `/admin/finance/reports/fees${qs ? `?${qs}` : ""}`;
      },
      providesTags: [FINANCE_TAG],
    }),

    getReconciliationCheck: builder.query<
      ApiResponse<import("@dhruto/contracts").ReconciliationCheckResult>,
      { merchantId?: string } | void
    >({
      query: (params) => {
        const qs = params?.merchantId ? `?merchantId=${params.merchantId}` : "";
        return `/admin/finance/reconciliation/check${qs}`;
      },
      providesTags: [FINANCE_TAG],
    }),
  }),
});

export const {
  useGetMyWalletQuery,
  useGetWalletTransactionsQuery,
  useGetMyPayoutsQuery,
  useGetMyPayoutQuery,
  useRequestPayoutMutation,
  useCancelPayoutMutation,
  useGetMySettlementsQuery,
  useGetMySettlementQuery,
  useGetPendingReconciliationsQuery,
  useVerifyCashHandInMutation,
  useGetHubHandInsQuery,
  useGetDiscrepanciesQuery,
  useGetReconciliationSummaryQuery,
  useGetFinanceOverviewQuery,
  useGetAdminPayoutsQuery,
  useApprovePayoutMutation,
  useProcessPayoutMutation,
  useGetAdminSettlementsQuery,
  useCreateSettlementBatchMutation,
  useGetSettlementBatchesQuery,
  useCompleteSettlementBatchMutation,
  useResolveDiscrepancyMutation,
  useCreateAdjustmentMutation,
  useReverseTransactionMutation,
  useGetJournalTransactionsQuery,
  useGetJournalTransactionQuery,
  useGetCodReportQuery,
  useGetFeeReportQuery,
  useGetReconciliationCheckQuery,
} = financeApi;
