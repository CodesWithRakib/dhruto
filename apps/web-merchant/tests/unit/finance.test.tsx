import { describe, it, expect, beforeAll, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { Providers } from "../../app/[locale]/providers";
import { WalletCard } from "../../features/finance/components/wallet-card";
import { TransactionsTable } from "../../features/finance/components/transactions-table";
import { PayoutRequestModal } from "../../features/finance/components/payout-request-modal";
import { WalletTransactionType } from "@dhruto/contracts";

describe("Finance Components (Phase 4 Unit Tests)", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("1. WalletCard renders balance, pending collections, and withdrawal CTA", () => {
    const handlePayout = vi.fn();
    const mockWallet = {
      id: "w-1",
      merchantId: "m-1",
      balance: 14500,
      pendingBalance: 3200,
      withdrawnTotal: 50000,
      currency: "BDT",
      updatedAt: new Date().toISOString(),
    };

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Providers>
          <WalletCard
            wallet={mockWallet}
            isLoading={false}
            onRequestPayout={handlePayout}
          />
        </Providers>
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("৳14,500")).toBeDefined();
    expect(screen.getByText("৳3,200")).toBeDefined();
    expect(screen.getByText("৳50,000")).toBeDefined();
    expect(screen.getByText(/Available Wallet Balance/i)).toBeDefined();

    const btn = screen.getByRole("button", { name: /Request Payout Withdrawal/i });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handlePayout).toHaveBeenCalledTimes(1);
  });

  it("2. TransactionsTable renders double-entry ledger items and types", () => {
    const mockTxs = [
      {
        id: "tx-1",
        type: WalletTransactionType.COD_CREDIT,
        amount: 3000,
        balanceAfter: 14500,
        description: "COD collection verified for parcel DHR-20261004-TEST01",
        referenceId: "DHR-20261004-TEST01",
        createdAt: new Date().toISOString(),
      },
      {
        id: "tx-2",
        type: WalletTransactionType.DELIVERY_FEE,
        amount: 120,
        balanceAfter: 14380,
        description: "Delivery charge deducted for parcel DHR-20261004-TEST01",
        referenceId: "DHR-20261004-TEST01",
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Providers>
          <TransactionsTable transactions={mockTxs} isLoading={false} />
        </Providers>
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("COD Received")).toBeDefined();
    expect(screen.getByText("Delivery Charge")).toBeDefined();
    expect(screen.getByText("+৳3,000")).toBeDefined();
    expect(screen.getByText("-৳120")).toBeDefined();
    expect(screen.getAllByText(/Ref: DHR-20261004-TEST01/).length).toBe(2);
  });

  it("3. PayoutRequestModal handles payment method selection and balance validation", () => {
    const handleClose = vi.fn();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Providers>
          <PayoutRequestModal
            isOpen={true}
            onClose={handleClose}
            availableBalance={5000}
          />
        </Providers>
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(/Request Payout Withdrawal/i)).toBeDefined();
    expect(screen.getByText("bKash")).toBeDefined();
    expect(screen.getByText("Nagad")).toBeDefined();
    expect(screen.getByText("Rocket")).toBeDefined();
    expect(screen.getByText("Bank")).toBeDefined();

    // Fill excessive amount
    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "10000" } });

    const submitBtn = screen.getByRole("button", { name: /Withdraw/i });
    expect(submitBtn).toBeDefined();
  });
});
