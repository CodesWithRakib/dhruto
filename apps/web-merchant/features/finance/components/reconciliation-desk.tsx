"use client";

import React, { useState } from "react";
import {
  useGetPendingReconciliationsQuery,
  useVerifyCashHandInMutation,
  useGetReconciliationSummaryQuery,
} from "../api/finance.api";
import {
  CheckCircle2,
  AlertCircle,
  Building2,
  Bike,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Coins,
  Receipt,
  Check,
} from "lucide-react";
import { Button, Input } from "@dhruto/ui";

export function ReconciliationDesk() {
  const { data: summaryRes, refetch: refetchSummary } = useGetReconciliationSummaryQuery();
  const { data: pendingRes, isLoading, isFetching, refetch: refetchPending } = useGetPendingReconciliationsQuery();
  const [verifyCashHandIn, { isLoading: isVerifying }] = useVerifyCashHandInMutation();

  const [activeLedgerId, setActiveLedgerId] = useState<string | null>(null);
  const [actualAmount, setActualAmount] = useState<string>("");
  const [verifyNotes, setVerifyNotes] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const summary = summaryRes?.data;
  const pendingItems = pendingRes?.data || [];

  const handleOpenVerify = (item: any) => {
    setActiveLedgerId(item.id);
    setActualAmount(item.amount.toString());
    setVerifyNotes(`Verified physical cash deposit at Hub for ${item.trackingCode}`);
    setFeedback(null);
  };

  const handleConfirmVerification = async (ledgerId: string) => {
    setFeedback(null);
    try {
      const res = await verifyCashHandIn({
        cashLedgerId: ledgerId,
        actualAmount: Number(actualAmount) || undefined,
        notes: verifyNotes.trim() || undefined,
      }).unwrap();

      setFeedback({
        type: "success",
        text: res.message || `Cash successfully verified and ৳${res.data?.netSettled} credited to merchant wallet!`,
      });
      setActiveLedgerId(null);
      refetchPending();
      refetchSummary();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.data?.message || err?.message || "Failed to verify cash ledger",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Live System Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verified COD Collections</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            ৳{(summary?.totalVerifiedCod || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Fully settled to merchant wallets
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Hub Clearance</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            ৳{(summary?.totalPendingCod || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-amber-400">
            {summary?.pendingReconciliationsCount || 0} parcels awaiting physical hand-in
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Disbursed Payouts</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            ৳{(summary?.totalDisbursedPayouts || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-indigo-400">
            Processed via bKash, Nagad & Bank
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Platform Merchant Balances</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            ৳{(summary?.totalMerchantBalance || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Across {summary?.totalWallets || 0} active wallets
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Pending Cash Reconciliation Table */}
      <div className="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Hub Manager Cash Hand-In Desk
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Verify physical cash collected by delivery riders. Approving will automatically record the double-entry credit and delivery fee deduction to the merchant wallet.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchPending();
              refetchSummary();
            }}
            disabled={isFetching}
            className="border-slate-800 text-slate-300 hover:bg-slate-800/80 text-xs rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh Desk</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Tracking Code</th>
                <th className="px-6 py-4 font-semibold">Recipient & Merchant</th>
                <th className="px-6 py-4 font-semibold">Rider & Hub</th>
                <th className="px-6 py-4 font-semibold text-right">COD Collected</th>
                <th className="px-6 py-4 font-semibold text-right">Delivery Fee</th>
                <th className="px-6 py-4 font-semibold text-right text-emerald-400">Net Merchant Credit</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-xs">
                    Loading pending cash reconciliations...
                  </td>
                </tr>
              ) : pendingItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mb-2" />
                      <p className="font-semibold text-slate-200">All rider cash hand-ins are verified!</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        No pending COD deposits require Hub Manager confirmation at this moment.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-400">
                      {item.trackingCode}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-200">{item.recipientName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span>{item.merchantName}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-200 flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.riderName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.hubName}</div>
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-slate-200">
                      ৳{item.amount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right text-xs text-rose-400">
                      -৳{item.deliveryFee.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      ৳{item.netPayable.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {activeLedgerId === item.id ? (
                        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-emerald-500/40">
                          <Input
                            type="number"
                            value={actualAmount}
                            onChange={(e) => setActualAmount(e.target.value)}
                            className="w-24 h-8 bg-slate-900 border-slate-700 text-xs text-white rounded-lg px-2"
                            placeholder="Actual ৳"
                          />
                          <Button
                            size="sm"
                            disabled={isVerifying}
                            onClick={() => handleConfirmVerification(item.id)}
                            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 rounded-lg"
                          >
                            {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveLedgerId(null)}
                            className="h-8 text-xs text-slate-400 hover:text-white px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          id={`verify-cash-${item.id}`}
                          size="sm"
                          onClick={() => handleOpenVerify(item)}
                          className="bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-semibold shadow-md shadow-emerald-950/30 flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify & Settle</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
