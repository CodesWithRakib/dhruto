"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
} from "@dhruto/ui";
import {
  Wallet,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  useGetCashSummaryQuery,
  useHandInCashMutation,
} from "../api/riders.api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

interface RiderCashModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function RiderCashModal({ onClose, onSuccess }: RiderCashModalProps) {
  const [notes, setNotes] = useState("");
  const { data, isLoading: isLoadingSummary, refetch } = useGetCashSummaryQuery();
  const [handInCashMutation, { isLoading: isSubmitting }] = useHandInCashMutation();

  const summary = data?.data || {
    totalCollected: 0,
    pendingHandIn: 0,
    awaitingVerification: 0,
    verifiedByHub: 0,
    totalParcelsCount: 0,
  };

  const handleHandIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (summary.pendingHandIn <= 0) {
      toast.info("No collected cash currently pending hand-in.");
      return;
    }

    try {
      const res = await handInCashMutation({
        notes: notes.trim() || undefined,
      }).unwrap();

      if (res.success) {
        toast.success(res.message || "Cash hand-in submitted successfully!");
        refetch();
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit cash hand-in"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md  border-primary/30">
        <CardHeader className="border-b pb-4 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Cash on Delivery (COD) Ledger
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              End-of-day collected cash reconciliation & hub hand-in
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {/* Summary Breakdown Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg border border-warning bg-warning-soft">
              <Clock className="h-4 w-4 text-warning mx-auto mb-1" />
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                In Hand
              </div>
              <div className="text-base font-bold font-mono text-warning mt-0.5">
                ৳{summary.pendingHandIn.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-info bg-info-soft">
              <ArrowRight className="h-4 w-4 text-info mx-auto mb-1" />
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                Submitted
              </div>
              <div className="text-base font-bold font-mono text-info mt-0.5">
                ৳{summary.awaitingVerification.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-success bg-success-soft">
              <ShieldCheck className="h-4 w-4 text-success mx-auto mb-1" />
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                Verified
              </div>
              <div className="text-base font-bold font-mono text-success mt-0.5">
                ৳{summary.verifiedByHub.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 text-xs flex justify-between items-center">
            <span className="text-muted-foreground">Lifetime Delivered Parcels</span>
            <span className="font-bold font-mono">{summary.totalParcelsCount} Orders</span>
          </div>

          {/* Hand-in Form */}
          <form onSubmit={handleHandIn} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold block mb-1">
                Hand-In Notes / Hub Receipt Reference (Optional)
              </label>
              <Input
                placeholder="e.g. Handed to Hub Supervisor at Sorting Desk"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || summary.pendingHandIn <= 0 || isLoadingSummary}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : `Hand In ৳${summary.pendingHandIn.toLocaleString()}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
