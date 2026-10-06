"use client";

import React, { useCallback, useState, useMemo } from "react";
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
import {
  Button,
  Input,
  DataTable,
  type ColumnDef,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@dhruto/ui";
import type { PendingReconciliationItem } from "@dhruto/contracts";
import { getApiErrorMessage } from "@/lib/api-error";

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

  const handleOpenVerify = (item: PendingReconciliationItem) => {
    setActiveLedgerId(item.id);
    setActualAmount(item.amount.toString());
    setVerifyNotes(`Verified physical cash deposit at Hub for ${item.trackingCode}`);
    setFeedback(null);
  };

  const handleConfirmVerification = useCallback(
    async (ledgerId: string) => {
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
    } catch (err) {
      setFeedback({
        type: "error",
        text: getApiErrorMessage(err, "Failed to verify cash ledger"),
      });
    }
    },
    [actualAmount, refetchPending, refetchSummary, verifyCashHandIn, verifyNotes],
  );

  const columns: ColumnDef<PendingReconciliationItem>[] = useMemo(
    () => [
      {
        accessorKey: "trackingCode",
        header: "Tracking Code",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-xs text-primary">
            {row.original.trackingCode}
          </span>
        ),
      },
      {
        id: "recipient",
        header: "Recipient & Merchant",
        cell: ({ row }) => (
          <div>
            <div className="text-xs font-semibold text-foreground">{row.original.recipientName}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-muted-foreground" />
              <span>{row.original.merchantName}</span>
            </div>
          </div>
        ),
      },
      {
        id: "logistics",
        header: "Rider & Hub",
        cell: ({ row }) => (
          <div>
            <div className="text-xs font-medium text-foreground flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-warning" />
              <span>{row.original.riderName}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{row.original.hubName}</div>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <span className="text-right block">COD Collected</span>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-foreground">
            ৳{row.original.amount.toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "deliveryFee",
        header: () => <span className="text-right block">Delivery Fee</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs text-danger">
            -৳{row.original.deliveryFee.toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "netPayable",
        header: () => <span className="text-right block text-success">Net Merchant Credit</span>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-success">
            ৳{row.original.netPayable.toLocaleString()}
          </div>
        ),
      },
      {
        id: "action",
        header: () => <span className="text-center block">Action</span>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-center">
              {activeLedgerId === item.id ? (
                <div className="inline-flex items-center justify-center gap-2 p-1.5 rounded-lg bg-surface-muted border border-success mx-auto">
                  <Input
                    type="number"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    className="w-24 h-8 bg-surface-muted border-border text-xs text-primary-foreground rounded px-2"
                    placeholder="Actual ৳"
                  />
                  <Button
                    size="sm"
                    disabled={isVerifying}
                    onClick={() => handleConfirmVerification(item.id)}
                    className="h-8 bg-success hover:bg-success text-primary-foreground text-xs px-2.5 rounded"
                  >
                    {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveLedgerId(null)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  id={`verify-cash-${item.id}`}
                  size="sm"
                  onClick={() => handleOpenVerify(item)}
                  className="bg-success-soft hover:bg-success text-primary-foreground text-xs px-3 py-1.5 rounded-md font-semibold shadow-sm flex items-center gap-1.5 mx-auto"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify & Settle</span>
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [activeLedgerId, actualAmount, handleConfirmVerification, isVerifying],
  );

  return (
    <div className="space-y-6">
      {/* Live System Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 shadow-sm border-border bg-surface">
          <div className="flex items-center justify-between text-caption font-medium text-muted-foreground">
            <span>Verified COD Collections</span>
            <Coins className="w-4 h-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            ৳{(summary?.totalVerifiedCod || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-success flex items-center gap-1">
            <Check className="w-3 h-3" /> Fully settled to merchant wallets
          </p>
        </Card>

        <Card className="p-4 sm:p-5 shadow-sm border-border bg-surface">
          <div className="flex items-center justify-between text-caption font-medium text-muted-foreground">
            <span>Pending Hub Clearance</span>
            <Receipt className="w-4 h-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            ৳{(summary?.totalPendingCod || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-warning">
            {summary?.pendingReconciliationsCount || 0} parcels awaiting physical hand-in
          </p>
        </Card>

        <Card className="p-4 sm:p-5 shadow-sm border-border bg-surface">
          <div className="flex items-center justify-between text-caption font-medium text-muted-foreground">
            <span>Total Disbursed Payouts</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            ৳{(summary?.totalDisbursedPayouts || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-primary">
            Processed via bKash, Nagad & Bank
          </p>
        </Card>

        <Card className="p-4 sm:p-5 shadow-sm border-border bg-surface">
          <div className="flex items-center justify-between text-caption font-medium text-muted-foreground">
            <span>Platform Merchant Balances</span>
            <ShieldCheck className="w-4 h-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            ৳{(summary?.totalMerchantBalance || 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Across {summary?.totalWallets || 0} active wallets
          </p>
        </Card>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-xs flex items-center gap-2 border ${
            feedback.type === "success"
              ? "bg-success-soft border-success text-success"
              : "bg-danger-soft border-danger text-danger"
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
      <div className="w-full space-y-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success" />
                Hub Manager Cash Hand-In Desk
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Verify physical cash collected by delivery riders. Approving will automatically record the double-entry credit and delivery fee deduction to the merchant wallet.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchPending();
                refetchSummary();
              }}
              disabled={isFetching}
              className="border-border text-foreground hover:bg-surface-muted text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Refresh Desk</span>
            </Button>
          </CardHeader>
        </Card>

        <DataTable
          columns={columns}
          data={pendingItems}
          isLoading={isLoading}
          emptyMessage="No pending COD deposits require Hub Manager confirmation at this moment."
        />
      </div>
    </div>
  );
}
