"use client";

import * as React from "react";
import { Shield } from "lucide-react";

interface CustomerAccountCardProps {
  name: string;
  phone: string;
}

export function CustomerAccountCard({ name, phone }: CustomerAccountCardProps) {
  return (
    <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Shield className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">Account &amp; Security</h3>
          <p className="text-[11px] text-muted-foreground">Verified recipient profile</p>
        </div>
      </div>

      <div className="space-y-2.5 pt-1 text-xs">
        <div className="flex justify-between py-1.5 px-3 rounded-xl bg-surface-muted/40">
          <span className="text-muted-foreground">Recipient Name</span>
          <span className="font-bold text-foreground">{name || "—"}</span>
        </div>
        <div className="flex justify-between py-1.5 px-3 rounded-xl bg-surface-muted/40">
          <span className="text-muted-foreground">Registered Phone</span>
          <span className="font-mono font-bold text-foreground">{phone || "—"}</span>
        </div>
        <div className="flex justify-between py-1.5 px-3 rounded-xl bg-surface-muted/40">
          <span className="text-muted-foreground">Role</span>
          <span className="font-semibold text-primary">Verified Customer</span>
        </div>
      </div>
    </div>
  );
}
