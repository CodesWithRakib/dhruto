"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@dhruto/ui";
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
          <Card className="border border-border/80 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Administrator Identity
              </CardTitle>
              <CardDescription className="text-xs">
                Your authenticated account has elevated privileges across the Dhruto operating network.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-surface-muted/40 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground">{authUser?.name || "System Admin"}</p>
                    <Badge variant="outline" className="border-primary/30 bg-primary-soft text-primary-soft-foreground text-[10px]">
                      {authUser?.role || "ADMIN"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{authUser?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Privilege Level
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">Global Supervisor</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Unrestricted access to all hubs, merchants, ledgers, and rider fleets.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Session Security
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-600">Active & Verified</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    JWT Session with HttpOnly refresh cookies & RBAC authorization.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Administration Links */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                System Surfaces
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/admin/integrations"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted hover:border-border"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Integrations & Outbox DLQ</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.finance}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted hover:border-border"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>Financial Console & Ledger</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.rider}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted hover:border-border"
              >
                <div className="flex items-center gap-2.5">
                  <Bike className="h-4 w-4 text-primary" />
                  <span>Rider Fleet Management</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={ADMIN_ROUTES.hub}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted hover:border-border"
              >
                <div className="flex items-center gap-2.5">
                  <Warehouse className="h-4 w-4 text-primary" />
                  <span>Hub Infrastructure</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
