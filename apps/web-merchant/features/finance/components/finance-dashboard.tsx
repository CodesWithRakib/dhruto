"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  useGetMyWalletQuery,
  useGetWalletTransactionsQuery,
  useGetMyPayoutsQuery,
} from "../api/finance.api";
import { WalletCard } from "./wallet-card";
import { PayoutRequestModal } from "./payout-request-modal";
import { TransactionsTable, ALL_TRANSACTION_TYPES } from "./transactions-table";
import { PayoutsView } from "./payouts-view";
import { SettlementsView } from "./settlements-view";
import { ReceiptText, History, Building, RefreshCw } from "lucide-react";
import { Button } from "@dhruto/ui";
import { PageHeader } from "@/components/page-header";
import { useQueryState } from "@/hooks/use-query-state";
import { WalletTransactionType } from "@dhruto/contracts";

type MerchantTab = "statement" | "payouts" | "settlements";

const PAGE_SIZE = 20;

/** Merchant finance surface: wallet, statement, payouts and settlements. */
export function FinanceDashboard() {
  const t = useTranslations("Finance");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // The statement filter lives in the URL so a filtered view is shareable and
  // survives a reload; the parent owns both the filter and the query.
  const query = useQueryState();
  const typeFilter = query.getString("type", ALL_TRANSACTION_TYPES) ?? ALL_TRANSACTION_TYPES;

  // The active tab also lives in the URL so refresh/share keep context.
  const tabParam = query.getString("tab", "statement") ?? "statement";
  const activeTab: MerchantTab =
    tabParam === "payouts" || tabParam === "settlements" ? tabParam : "statement";
  const setActiveTab = (tab: MerchantTab) => {
    query.set({ tab: tab === "statement" ? null : tab });
  };

  const {
    data: walletRes,
    isLoading: isWalletLoading,
    refetch: refetchWallet,
  } = useGetMyWalletQuery();

  const {
    data: txRes,
    isLoading: isTxLoading,
    refetch: refetchTx,
  } = useGetWalletTransactionsQuery({
    page,
    limit: PAGE_SIZE,
    type: typeFilter === ALL_TRANSACTION_TYPES ? undefined : (typeFilter as WalletTransactionType),
  });

  const { data: payoutsRes, refetch: refetchPayouts } = useGetMyPayoutsQuery();

  const wallet = walletRes?.data;
  const transactions = txRes?.data || [];
  const payouts = payoutsRes?.data || [];

  const handleTypeFilterChange = (next: string) => {
    query.set({ type: next === ALL_TRANSACTION_TYPES ? null : next });
    setPage(1);
  };

  const handleRefresh = () => {
    refetchWallet();
    refetchTx();
    refetchPayouts();
  };

  const tabs: Array<{ key: MerchantTab; label: string; icon: typeof ReceiptText }> = [
    { key: "statement", label: t("statementTab"), icon: ReceiptText },
    { key: "payouts", label: `${t("payoutsTab")} (${payouts.length})`, icon: History },
    { key: "settlements", label: t("settlementsTab"), icon: Building },
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-10 gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("refresh")}
          </Button>
        }
      />

      <WalletCard
        wallet={wallet}
        isLoading={isWalletLoading}
        onRequestPayout={() => setIsPayoutModalOpen(true)}
      />

      <div
        className="flex w-fit max-w-full snap-x items-center gap-1 overflow-x-auto rounded-xl border border-border/70 bg-surface-muted p-1"
        role="tablist"
        aria-label={t("title")}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            id={`finance-tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls="finance-tabpanel"
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id="finance-tabpanel" aria-labelledby={`finance-tab-${activeTab}`}>
      {activeTab === "statement" && (
        <TransactionsTable
          transactions={transactions}
          isLoading={isTxLoading}
          page={page}
          onPageChange={setPage}
          hasMore={transactions.length === PAGE_SIZE}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
        />
      )}

      {activeTab === "payouts" && <PayoutsView onChanged={handleRefresh} />}

      {activeTab === "settlements" && <SettlementsView />}

      </div>

      <PayoutRequestModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        availableBalance={Number(wallet?.balance || 0)}
      />
    </div>
  );
}
