"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import {
  Server,
  Layers,
  Wallet,
  Bike,
  Warehouse,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { ADMIN_ROUTES } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";

export default function AdminSettingsPage() {
  const authUser = useAppSelector((s) => s.auth.user);

  return (
    <div className="w-full space-y-6 pb-6">
      <PageHeader
        title="Admin Console & Settings"
        description="System administration, role privileges, and platform-wide configurations."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Administrator Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-surface-elevated p-6 sm:p-8 space-y-6">
            <div className="pb-1">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <UserCheck className="h-4 w-4 text-primary" />
                Administrator Identity
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your authenticated account has elevated privileges across the Dhruto operating network.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl bg-surface-muted/60 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground">{authUser?.name || "System Admin"}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                      {authUser?.role || "ADMIN"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{authUser?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-muted/60 p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Privilege Level
                  </p>
                  <p className="text-sm font-bold text-foreground">Global Supervisor</p>
                  <p className="text-xs text-muted-foreground">
                    Unrestricted access to all hubs, merchants, ledgers, and rider fleets.
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-muted/60 p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Session Security
                  </p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Active & Verified</p>
                  <p className="text-xs text-muted-foreground">
                    JWT Session with HttpOnly refresh cookies & RBAC authorization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Administration Links */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-surface-elevated p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <Server className="h-4 w-4 text-primary" />
              System Surfaces
            </h3>

            <div className="space-y-2">
              <Link
                href="/admin/integrations"
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Integrations & Outbox DLQ</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.finance}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>Financial Console & Ledger</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.rider}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Bike className="h-4 w-4 text-primary" />
                  <span>Rider Fleet Management</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.hub}
                className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs font-semibold text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Warehouse className="h-4 w-4 text-primary" />
                  <span>Hub Infrastructure</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
