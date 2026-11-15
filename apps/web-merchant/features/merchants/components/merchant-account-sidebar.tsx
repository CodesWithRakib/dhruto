"use client";

import React from "react";
import { Bell, ExternalLink, ShieldCheck, Wallet, Webhook } from "lucide-react";
import { CopyButton } from "@/components/data-display/copy-button";
import { Link } from "@/lib/navigation";
import { MERCHANT_ROUTES } from "@/config/routes";

interface MerchantAccountSidebarProps {
  merchantId?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
}

export function MerchantAccountSidebar({
  merchantId,
  userName = "Merchant",
  userEmail,
  createdAt,
}: MerchantAccountSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Identity & Technical Info */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface-elevated/90 p-6 space-y-4 shadow-sm backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <h3 className="text-body-md font-bold flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Account Details</span>
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <p className="text-muted-foreground text-caption font-bold uppercase tracking-wider">Merchant ID</p>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-border/70 bg-surface-muted/60 px-3 py-2 font-mono text-[11px]">
              <span className="truncate max-w-[180px] font-semibold text-foreground">{merchantId || "N/A"}</span>
              {merchantId ? (
                <CopyButton
                  value={merchantId}
                  label="Copy Merchant ID"
                  copiedLabel="Copied"
                  errorLabel="Error"
                  size="sm"
                />
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-caption font-bold uppercase tracking-wider">User Account</p>
            <p className="font-bold mt-0.5 text-foreground text-body-sm">{userName}</p>
            <p className="text-caption text-muted-foreground font-mono">{userEmail}</p>
          </div>

          <div>
            <p className="text-muted-foreground text-caption font-bold uppercase tracking-wider">Member Since</p>
            <p className="font-bold mt-0.5 text-foreground">
              {createdAt
                ? new Date(createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Active"}
            </p>
          </div>
        </div>
      </div>

      {/* Connected Shortcuts */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface-elevated/90 p-6 space-y-3 shadow-sm backdrop-blur-md">
        <h3 className="text-body-md font-bold text-foreground">Quick Links</h3>

        <div className="space-y-2">
          <Link
            href={MERCHANT_ROUTES.webhooks}
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface-muted/50 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted hover:border-border"
          >
            <div className="flex items-center gap-2.5">
              <Webhook className="h-4 w-4 text-primary" />
              <span>Webhooks & API Keys</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>

          <Link
            href={MERCHANT_ROUTES.finance}
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface-muted/50 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted hover:border-border"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Wallet & Payouts</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>

          <Link
            href="/merchant/notifications"
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface-muted/50 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted hover:border-border"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-primary" />
              <span>Notification Center</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
