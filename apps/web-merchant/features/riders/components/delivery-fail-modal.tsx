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
  AlertTriangle,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import { useFailDeliveryMutation } from "../api/riders.api";
import { toast } from "sonner";
import { DeliveryFailureReason, type RiderTaskItem } from "@dhruto/contracts";

interface DeliveryFailModalProps {
  task: RiderTaskItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeliveryFailModal({ task, onClose, onSuccess }: DeliveryFailModalProps) {
  const [reason, setReason] = useState<DeliveryFailureReason>(
    DeliveryFailureReason.CUSTOMER_UNAVAILABLE,
  );
  const [rescheduledDate, setRescheduledDate] = useState("");
  const [notes, setNotes] = useState("");

  const [failDeliveryMutation, { isLoading }] = useFailDeliveryMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await failDeliveryMutation({
        parcelId: task.id,
        dto: {
          reason,
          rescheduledDate: rescheduledDate || undefined,
          notes: notes.trim() || undefined,
        },
      }).unwrap();

      if (res.success) {
        toast.info(res.message || "Delivery attempt issue recorded");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to record issue");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-amber-500/30">
        <CardHeader className="border-b pb-4 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Report Delivery Issue / Reschedule
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
            <div>
              <label className="text-xs font-semibold block mb-1.5">
                Failure / Non-Delivery Reason <span className="text-destructive">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as DeliveryFailureReason)}
                className="w-full border rounded-md p-2 bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                required
              >
                <option value={DeliveryFailureReason.CUSTOMER_UNAVAILABLE}>
                  📵 Customer Unavailable / Unreachable
                </option>
                <option value={DeliveryFailureReason.CUSTOMER_REQUESTED_RESCHEDULE}>
                  🗓️ Customer Requested Reschedule
                </option>
                <option value={DeliveryFailureReason.PAYMENT_NOT_READY}>
                  💵 COD Payment Not Ready
                </option>
                <option value={DeliveryFailureReason.ADDRESS_INCORRECT}>
                  📍 Incorrect / Incomplete Delivery Address
                </option>
                <option value={DeliveryFailureReason.CUSTOMER_REFUSED}>
                  🛑 Customer Refused to Accept Parcel
                </option>
                <option value={DeliveryFailureReason.DAMAGED_PACKAGE}>
                  📦 Package Damaged in Transit
                </option>
                <option value={DeliveryFailureReason.OTHER}>
                  ❓ Other Reason
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Next Delivery Attempt Date (Optional)
              </label>
              <Input
                type="date"
                value={rescheduledDate}
                onChange={(e) => setRescheduledDate(e.target.value)}
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5" />
                Rider Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Phone rang 3 times with no answer"
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
                variant="destructive"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Submit Attempt Report"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
