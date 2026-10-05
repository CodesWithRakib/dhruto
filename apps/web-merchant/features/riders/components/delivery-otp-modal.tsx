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
  Badge,
} from "@dhruto/ui";
import {
  KeyRound,
  CheckCircle2,
  DollarSign,
  FileText,
  X,
} from "lucide-react";
import { useCompleteDeliveryMutation } from "../api/riders.api";
import { toast } from "sonner";
import { type RiderTaskItem } from "@dhruto/contracts";

interface DeliveryOtpModalProps {
  task: RiderTaskItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeliveryOtpModal({ task, onClose, onSuccess }: DeliveryOtpModalProps) {
  const [otp, setOtp] = useState("");
  const [remarks, setRemarks] = useState("Delivered to recipient in person");
  const [collectedAmount, setCollectedAmount] = useState<number>(task.codAmount || 0);

  const [completeDeliveryMutation, { isLoading }] = useCompleteDeliveryMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (task.deliveryOtp && otp.trim() !== task.deliveryOtp) {
      toast.error(`Invalid OTP code. For testing, customer OTP is: ${task.deliveryOtp}`);
      return;
    }

    try {
      const res = await completeDeliveryMutation({
        parcelId: task.id,
        dto: {
          otp: otp.trim() || undefined,
          codAmountCollected: collectedAmount,
          remarks: remarks.trim() || undefined,
        },
      }).unwrap();

      if (res.success) {
        toast.success(res.message || "Parcel successfully marked as DELIVERED!");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to complete delivery");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md  border-success">
        <CardHeader className="border-b pb-4 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Complete Delivery
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              Tracking: {task.trackingCode}
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recipient summary */}
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-semibold">{task.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{task.recipientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium text-right truncate max-w-[200px]">{task.deliveryAddress}</span>
              </div>
            </div>

            {/* OTP Entry */}
            <div>
              <label className="text-sm font-semibold flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-success" />
                  Customer Delivery OTP
                </span>
                {task.deliveryOtp && (
                  <Badge variant="outline" className="text-[10px] font-mono border-primary text-primary">
                    Test OTP: {task.deliveryOtp}
                  </Badge>
                )}
              </label>
              <Input
                placeholder="6-digit OTP code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center font-mono text-lg tracking-widest uppercase font-bold"
                required={!!task.deliveryOtp}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Enter the 6-digit confirmation code provided by the recipient
              </p>
            </div>

            {/* COD Cash Collection */}
            {task.codAmount > 0 ? (
              <div className="p-3.5 rounded-xl border border-warning bg-warning-soft">
                <label className="text-xs font-semibold text-warning  flex items-center gap-1.5 mb-1.5">
                  <DollarSign className="h-4 w-4" />
                  COD Cash to Collect
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-mono text-warning">৳</span>
                  <Input
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(Number(e.target.value))}
                    min={0}
                    className="font-mono font-bold text-lg"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Expected order COD: ৳{task.codAmount.toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-success-soft text-success text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Prepaid Parcel — No Cash Collection Required
              </div>
            )}

            {/* Remarks / Proof note */}
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5" />
                Delivery Notes / Handover Remarks
              </label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Received by customer, gatekeeper, etc."
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-success hover:bg-success text-primary-foreground gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isLoading ? "Verifying..." : "Confirm & Deliver"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
