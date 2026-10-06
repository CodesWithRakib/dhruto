"use client";

import React, { useState } from "react";
import { PayoutMethod } from "@dhruto/contracts";
import { useRequestPayoutMutation } from "../api/finance.api";
import { X, CheckCircle, AlertCircle, Building2, Smartphone, ArrowRight, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@dhruto/ui";
import { getApiErrorMessage } from "@/lib/api-error";

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
}

export function PayoutRequestModal({ isOpen, onClose, availableBalance }: PayoutRequestModalProps) {
  const [method, setMethod] = useState<PayoutMethod>(PayoutMethod.BKASH);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"PERSONAL" | "MERCHANT">("PERSONAL");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [requestPayout, { isLoading }] = useRequestPayoutMutation();

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isOverBalance = numAmount > availableBalance;
  const isUnderMin = numAmount < 100 && numAmount > 0;

  const handleQuickAmount = (val: number) => {
    const capped = Math.min(val, availableBalance);
    setAmount(capped.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (numAmount < 100) {
      setErrorMsg("Minimum withdrawal amount is ৳100");
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMsg(`Withdrawal amount cannot exceed available balance (৳${availableBalance.toLocaleString()})`);
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMsg("Please enter an account or mobile number");
      return;
    }

    try {
      await requestPayout({
        amount: numAmount,
        payoutMethod: method,
        accountDetails: {
          accountNumber: accountNumber.trim(),
          accountType,
          bankName: method === PayoutMethod.BANK_TRANSFER ? bankName.trim() : undefined,
          branchName: method === PayoutMethod.BANK_TRANSFER ? branchName.trim() : undefined,
          accountHolderName: method === PayoutMethod.BANK_TRANSFER ? accountHolderName.trim() : undefined,
        },
        notes: notes.trim() || undefined,
      }).unwrap();

      setSuccessMsg(`Payout request for ৳${numAmount.toLocaleString()} submitted successfully!`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setAmount("");
        setAccountNumber("");
      }, 1500);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Failed to submit payout request"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-surface-muted border border-border p-6 sm:p-8  overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h3 className="text-xl font-bold text-primary-foreground tracking-tight">Request Payout Withdrawal</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available: <span className="text-success font-semibold">৳{availableBalance.toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-primary-foreground hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-danger-soft border border-danger text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-success-soft border border-success text-success text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Method Selection */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payout Channel
            </Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.BKASH)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.BKASH
                    ? "border-primary bg-primary-soft text-primary font-bold  shadow-pink-950/20"
                    : "border-border bg-surface-muted text-muted-foreground hover:border-border"
                }`}
              >
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="text-xs">bKash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.NAGAD)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.NAGAD
                    ? "border-warning bg-warning-soft text-warning font-bold  shadow-amber-950/20"
                    : "border-border bg-surface-muted text-muted-foreground hover:border-border"
                }`}
              >
                <Smartphone className="w-4 h-4 text-warning" />
                <span className="text-xs">Nagad</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.ROCKET)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.ROCKET
                    ? "border-primary bg-primary-soft text-primary font-bold  shadow-purple-950/20"
                    : "border-border bg-surface-muted text-muted-foreground hover:border-border"
                }`}
              >
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="text-xs">Rocket</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.BANK_TRANSFER)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.BANK_TRANSFER
                    ? "border-primary bg-primary-soft text-primary font-bold  shadow-indigo-950/20"
                    : "border-border bg-surface-muted text-muted-foreground hover:border-border"
                }`}
              >
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-xs">Bank</span>
              </button>
            </div>
          </div>

          {/* Account Details */}
          <div>
            <Label htmlFor="account-num-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {method === PayoutMethod.BANK_TRANSFER ? "Bank Account Number" : `${method} Wallet Number`}
            </Label>
            <Input
              id="account-num-input"
              type="text"
              required
              placeholder={method === PayoutMethod.BANK_TRANSFER ? "e.g. 1029384756102" : "017XXXXXXXX"}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="mt-1.5 bg-surface-muted border-border text-primary-foreground rounded-2xl focus:border-success"
            />
          </div>

          {method !== PayoutMethod.BANK_TRANSFER && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Wallet Type:</span>
              <button
                type="button"
                onClick={() => setAccountType("PERSONAL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  accountType === "PERSONAL"
                    ? "bg-success-soft text-success border border-success"
                    : "bg-surface-muted text-muted-foreground border border-border"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setAccountType("MERCHANT")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  accountType === "MERCHANT"
                    ? "bg-success-soft text-success border border-success"
                    : "bg-surface-muted text-muted-foreground border border-border"
                }`}
              >
                Merchant
              </button>
            </div>
          )}

          {method === PayoutMethod.BANK_TRANSFER && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="holder-name-input" className="text-xs text-muted-foreground">Account Holder Name</Label>
                <Input
                  id="holder-name-input"
                  type="text"
                  placeholder="e.g. Rahim Enterprise"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="mt-1 bg-surface-muted border-border text-primary-foreground rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bank-name-input" className="text-xs text-muted-foreground">Bank Name</Label>
                  <Input
                    id="bank-name-input"
                    type="text"
                    placeholder="e.g. BRAC Bank PLC"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 bg-surface-muted border-border text-primary-foreground rounded-xl text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="branch-name-input" className="text-xs text-muted-foreground">Branch Name</Label>
                  <Input
                    id="branch-name-input"
                    type="text"
                    placeholder="e.g. Gulshan 1"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="mt-1 bg-surface-muted border-border text-primary-foreground rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amount Input & Fast Selector Chips */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="payout-amount-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount (BDT)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {isUnderMin ? <span className="text-danger font-semibold">Min ৳100</span> : "Min ৳100"}
              </span>
            </div>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">৳</span>
              <Input
                id="payout-amount-input"
                type="number"
                min="100"
                max={availableBalance}
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`pl-9 bg-surface-muted border-border text-primary-foreground rounded-2xl text-lg font-bold ${
                  isOverBalance ? "border-danger focus:border-danger" : "focus:border-success"
                }`}
              />
            </div>

            {/* Quick chips */}
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {[500, 1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  disabled={val > availableBalance}
                  className="px-2.5 py-1 rounded-xl bg-surface-muted hover:bg-surface-muted text-xs font-medium text-foreground disabled:opacity-40 transition-colors border border-border"
                >
                  +৳{val.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleQuickAmount(availableBalance)}
                disabled={availableBalance < 100}
                className="px-2.5 py-1 rounded-xl bg-success-soft hover:bg-success-soft text-xs font-semibold text-success transition-colors border border-success"
              >
                Max (৳{availableBalance.toLocaleString()})
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="payout-notes-input" className="text-xs text-muted-foreground">Notes (Optional)</Label>
            <Input
              id="payout-notes-input"
              type="text"
              placeholder="e.g. Weekly vendor settlement"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-surface-muted border-border text-primary-foreground rounded-xl text-xs"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-1/3 rounded-2xl border-border text-foreground hover:bg-surface-muted"
            >
              Cancel
            </Button>
            <Button
              id="submit-payout-btn"
              type="submit"
              disabled={isLoading || isOverBalance || numAmount < 100}
              className="w-2/3 bg-success hover:bg-success text-primary-foreground font-bold py-3 rounded-2xl  shadow-emerald-950/30 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Withdraw ৳{numAmount ? numAmount.toLocaleString() : "0"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
