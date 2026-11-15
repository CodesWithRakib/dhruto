"use client";

import React, { useState } from "react";
import { Loader2, Plus, Webhook, X } from "lucide-react";
import { Button } from "@dhruto/ui";
import { WebhookEvent } from "@dhruto/contracts";

export const AVAILABLE_EVENTS = [
  {
    event: WebhookEvent.PARCEL_CREATED,
    label: "parcel.created",
    desc: "Triggered whenever a merchant books a new parcel",
  },
  {
    event: WebhookEvent.PARCEL_ASSIGNED,
    label: "parcel.assigned",
    desc: "Dispatched when a rider is assigned to the parcel",
  },
  {
    event: WebhookEvent.PARCEL_OUT_FOR_DELIVERY,
    label: "parcel.out_for_delivery",
    desc: "Dispatched when rider departs for destination",
  },
  {
    event: WebhookEvent.PARCEL_DELIVERED,
    label: "parcel.delivered",
    desc: "Dispatched when customer confirms delivery receipt",
  },
  {
    event: WebhookEvent.PARCEL_FAILED,
    label: "parcel.failed",
    desc: "Dispatched when a delivery attempt fails",
  },
  {
    event: WebhookEvent.PARCEL_RETURNED,
    label: "parcel.returned",
    desc: "Dispatched when a parcel is returned to origin (RTO)",
  },
  {
    event: WebhookEvent.CASH_VERIFIED,
    label: "cash.verified",
    desc: "Dispatched when COD cash is reconciled & credited to wallet",
  },
  {
    event: WebhookEvent.SETTLEMENT_CREATED,
    label: "settlement.created",
    desc: "Dispatched when a per-parcel settlement is posted",
  },
  {
    event: WebhookEvent.PAYOUT_REQUESTED,
    label: "payout.requested",
    desc: "Dispatched when a payout withdrawal is requested",
  },
  {
    event: WebhookEvent.PAYOUT_APPROVED,
    label: "payout.approved",
    desc: "Dispatched when a payout is approved for processing",
  },
  {
    event: WebhookEvent.PAYOUT_COMPLETED,
    label: "payout.completed",
    desc: "Dispatched when merchant payout withdrawal completes",
  },
  {
    event: WebhookEvent.PAYOUT_FAILED,
    label: "payout.failed",
    desc: "Dispatched when a payout fails and funds return to wallet",
  },
  {
    event: WebhookEvent.PING,
    label: "webhook.ping",
    desc: "Dispatched during endpoint health checks and manual testing",
  },
];

interface WebhookCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    url: string;
    description?: string;
    events: string[];
    secret?: string;
  }) => Promise<void>;
  isLoading: boolean;
  formError: string | null;
}

export function WebhookCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  formError,
}: WebhookCreateModalProps) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    WebhookEvent.PARCEL_CREATED,
    WebhookEvent.PARCEL_DELIVERED,
    WebhookEvent.CASH_VERIFIED,
    WebhookEvent.PING,
  ]);
  const [customSecret, setCustomSecret] = useState("");

  if (!isOpen) return null;

  const handleToggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      url,
      description: description.trim() || undefined,
      events: selectedEvents,
      secret: customSecret.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-elevated text-card-foreground border border-border/80 rounded-3xl max-w-xl w-full p-6 sm:p-7 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-xl"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-border/60 pb-4">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Webhook className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Register Webhook Endpoint</h3>
            <p className="text-caption text-muted-foreground">
              Deliveries include HMAC-SHA256 signature header for verification.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Destination URL <span className="text-destructive">*</span>
            </label>
            <input
              type="url"
              placeholder="https://api.yourdomain.com/webhooks/dhruto"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full text-sm border border-border/80 rounded-xl px-3.5 py-2.5 bg-surface-muted/50 focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary font-mono transition-colors"
            />
          </div>

          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Description / Label (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Production ERP Sync"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-border/80 rounded-xl px-3.5 py-2.5 bg-surface-muted/50 focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Subscribed Events <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border/70 rounded-2xl p-3 bg-surface-muted/30 max-h-48 overflow-y-auto">
              {AVAILABLE_EVENTS.map(({ event, label, desc }) => {
                const checked = selectedEvents.includes(event);
                return (
                  <label
                    key={event}
                    className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                      checked
                        ? "bg-primary/10 border-primary/30 text-foreground"
                        : "bg-surface-elevated border-border/60 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleEvent(event)}
                      className="mt-0.5 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-mono font-bold block text-foreground">
                        {label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        {desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Custom Secret (Optional)</label>
            <input
              type="text"
              placeholder="Leave empty to auto-generate secure dhr_whsec_... key"
              value={customSecret}
              onChange={(e) => setCustomSecret(e.target.value)}
              className="w-full text-xs border border-border/80 rounded-xl px-3.5 py-2.5 bg-surface-muted/50 focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-primary font-mono transition-colors"
            />
          </div>

          {formError && (
            <div className="text-xs p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl border-border/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-xl font-bold shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Register Endpoint</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
