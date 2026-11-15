"use client";

import * as React from "react";
import { Bell, Smartphone, MessageSquare } from "lucide-react";
import { Button, Switch } from "@dhruto/ui";

interface CustomerNotificationsCardProps {
  smsOtp: boolean;
  setSmsOtp: (val: boolean) => void;
  whatsappUpdates: boolean;
  setWhatsappUpdates: (val: boolean) => void;
  deliveryEmails: boolean;
  setDeliveryEmails: (val: boolean) => void;
  onSave: () => void;
}

export function CustomerNotificationsCard({
  smsOtp,
  setSmsOtp,
  whatsappUpdates,
  setWhatsappUpdates,
  deliveryEmails,
  setDeliveryEmails,
  onSave,
}: CustomerNotificationsCardProps) {
  return (
    <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Bell className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">Delivery Notifications</h3>
          <p className="text-[11px] text-muted-foreground">Manage how you receive OTP and tracking alerts</p>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              SMS OTP &amp; Handoff Alerts
            </span>
            <p className="text-[11px] text-muted-foreground">
              Receive instant SMS when rider is en route and with delivery OTP.
            </p>
          </div>
          <Switch checked={smsOtp} onCheckedChange={setSmsOtp} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              WhatsApp Live Tracking
            </span>
            <p className="text-[11px] text-muted-foreground">
              Get real-time map link and rider status updates via WhatsApp.
            </p>
          </div>
          <Switch checked={whatsappUpdates} onCheckedChange={setWhatsappUpdates} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <span className="text-xs font-semibold text-foreground">Email Digital POD Receipts</span>
            <p className="text-[11px] text-muted-foreground">
              Receive completed delivery proof and invoices to your email.
            </p>
          </div>
          <Switch checked={deliveryEmails} onCheckedChange={setDeliveryEmails} />
        </div>
      </div>

      <Button
        size="sm"
        className="w-full h-10 rounded-2xl text-xs font-semibold"
        onClick={onSave}
      >
        Save Notification Settings
      </Button>
    </div>
  );
}
