"use client";

import React, { useState } from "react";
import { PayoutMethod } from "@dhruto/contracts";
import { useRequestPayoutMutation } from "../api/finance.api";
import { X, CheckCircle, AlertCircle, Building2, Smartphone, ArrowRight, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@dhruto/ui";

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
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to submit payout request";
      setErrorMsg(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Request Payout Withdrawal</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Available: <span className="text-emerald-400 font-semibold">৳{availableBalance.toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Method Selection */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Payout Channel
            </Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.BKASH)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.BKASH
                    ? "border-pink-500/80 bg-pink-500/15 text-pink-300 font-bold shadow-lg shadow-pink-950/20"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Smartphone className="w-4 h-4 text-pink-400" />
                <span className="text-xs">bKash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.NAGAD)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.NAGAD
                    ? "border-amber-500/80 bg-amber-500/15 text-amber-300 font-bold shadow-lg shadow-amber-950/20"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span className="text-xs">Nagad</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.ROCKET)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.ROCKET
                    ? "border-purple-500/80 bg-purple-500/15 text-purple-300 font-bold shadow-lg shadow-purple-950/20"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span className="text-xs">Rocket</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod(PayoutMethod.BANK_TRANSFER)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === PayoutMethod.BANK_TRANSFER
                    ? "border-indigo-500/80 bg-indigo-500/15 text-indigo-300 font-bold shadow-lg shadow-indigo-950/20"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs">Bank</span>
              </button>
            </div>
          </div>

          {/* Account Details */}
          <div>
            <Label htmlFor="account-num-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {method === PayoutMethod.BANK_TRANSFER ? "Bank Account Number" : `${method} Wallet Number`}
            </Label>
            <Input
              id="account-num-input"
              type="text"
              required
              placeholder={method === PayoutMethod.BANK_TRANSFER ? "e.g. 1029384756102" : "017XXXXXXXX"}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="mt-1.5 bg-slate-950/60 border-slate-800 text-white rounded-2xl focus:border-emerald-500/60"
            />
          </div>

          {method !== PayoutMethod.BANK_TRANSFER && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Wallet Type:</span>
              <button
                type="button"
                onClick={() => setAccountType("PERSONAL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  accountType === "PERSONAL"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-950/40 text-slate-500 border border-slate-800"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setAccountType("MERCHANT")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  accountType === "MERCHANT"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-950/40 text-slate-500 border border-slate-800"
                }`}
              >
                Merchant
              </button>
            </div>
          )}

          {method === PayoutMethod.BANK_TRANSFER && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="holder-name-input" className="text-xs text-slate-400">Account Holder Name</Label>
                <Input
                  id="holder-name-input"
                  type="text"
                  placeholder="e.g. Rahim Enterprise"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="mt-1 bg-slate-950/60 border-slate-800 text-white rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bank-name-input" className="text-xs text-slate-400">Bank Name</Label>
                  <Input
                    id="bank-name-input"
                    type="text"
                    placeholder="e.g. BRAC Bank PLC"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 bg-slate-950/60 border-slate-800 text-white rounded-xl text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="branch-name-input" className="text-xs text-slate-400">Branch Name</Label>
                  <Input
                    id="branch-name-input"
                    type="text"
                    placeholder="e.g. Gulshan 1"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="mt-1 bg-slate-950/60 border-slate-800 text-white rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amount Input & Fast Selector Chips */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="payout-amount-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Amount (BDT)
              </Label>
              <span className="text-[11px] text-slate-500">
                {isUnderMin ? <span className="text-rose-400 font-semibold">Min ৳100</span> : "Min ৳100"}
              </span>
            </div>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">৳</span>
              <Input
                id="payout-amount-input"
                type="number"
                min="100"
                max={availableBalance}
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`pl-9 bg-slate-950/60 border-slate-800 text-white rounded-2xl text-lg font-bold ${
                  isOverBalance ? "border-rose-500/80 focus:border-rose-500" : "focus:border-emerald-500/60"
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
                  className="px-2.5 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-medium text-slate-300 disabled:opacity-40 transition-colors border border-slate-700/50"
                >
                  +৳{val.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleQuickAmount(availableBalance)}
                disabled={availableBalance < 100}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 transition-colors border border-emerald-500/30"
              >
                Max (৳{availableBalance.toLocaleString()})
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="payout-notes-input" className="text-xs text-slate-400">Notes (Optional)</Label>
            <Input
              id="payout-notes-input"
              type="text"
              placeholder="e.g. Weekly vendor settlement"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-slate-950/60 border-slate-800 text-white rounded-xl text-xs"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-1/3 rounded-2xl border-slate-800 text-slate-300 hover:bg-slate-800/80"
            >
              Cancel
            </Button>
            <Button
              id="submit-payout-btn"
              type="submit"
              disabled={isLoading || isOverBalance || numAmount < 100}
              className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl shadow-xl shadow-emerald-950/30 flex items-center justify-center gap-2"
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
