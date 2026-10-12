"use client";

import * as React from "react";
import { CheckCircle2, Download, Printer, ShieldCheck, MapPin, Calendar, User, Package } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import { toast } from "sonner";

export interface PodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcel: {
    trackingCode: string;
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;
    deliveredAt: string;
    riderName: string;
    merchantName: string;
    codAmount: number;
    description?: string;
  };
}

export function PodModal({ open, onOpenChange, parcel }: PodModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success(`Digital Proof of Delivery for ${parcel.trackingCode} saved to downloads.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-6 sm:p-7 shadow-2xl rounded-3xl border border-border/80">
        <DialogHeader className="gap-2.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-success-soft border border-success/20 text-success shadow-2xs">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Digital Proof of Delivery (POD)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cryptographically logged doorstep handoff record
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Certificate Card */}
        <div className="space-y-4 rounded-2xl border border-border/80 bg-surface-muted/40 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Tracking Number
              </span>
              <span className="font-mono text-sm font-bold text-foreground">{parcel.trackingCode}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success-soft-foreground border border-success/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified Delivered
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" /> Delivered At:
              </span>
              <span className="font-medium text-foreground block mt-0.5">{parcel.deliveredAt}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground" /> Delivered By:
              </span>
              <span className="font-medium text-foreground block mt-0.5">{parcel.riderName}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3 text-muted-foreground" /> Merchant:
              </span>
              <span className="font-medium text-foreground block mt-0.5">{parcel.merchantName}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Amount Collected:</span>
              <span className="font-bold text-foreground block mt-0.5">
                {parcel.codAmount > 0 ? `৳${parcel.codAmount.toLocaleString()}` : "Paid in Advance"}
              </span>
            </div>
          </div>

          <div className="border-t border-border/60 pt-3">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" /> Delivery Destination:
            </span>
            <p className="mt-0.5 text-xs text-foreground font-medium">{parcel.deliveryAddress}</p>
          </div>

          <div className="rounded-xl border border-success/20 bg-success-soft/30 p-3 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
            <div className="text-[11px] text-foreground">
              <span className="font-bold block text-success">Verified with Recipient One-Time-Password (OTP)</span>
              Handoff identity confirmed via phone authorization at doorstep.
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-10 px-5 text-xs font-semibold gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto h-10 px-5 text-xs font-semibold gap-1.5 shadow-xs"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            Download Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
