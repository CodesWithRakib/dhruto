"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, Clock, ShieldAlert, Users, Wallet } from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { ADMIN_ROUTES } from "@/config/routes";
import { useGetAdminPayoutsQuery, useGetPendingReconciliationsQuery } from "@/features/finance/api/finance.api";
import { useGetExceptionsQuery } from "@/features/hubs/api/hubs.api";
import { useGetOperationalAnalyticsQuery } from "@/features/analytics/api/analytics.api";
import { ExceptionStatus, PayoutStatus } from "@dhruto/contracts";

export function AdminSupervisoryQueues() {
  // Live supervisory queue queries
  const { data: payoutsData } = useGetAdminPayoutsQuery(
    { status: PayoutStatus.REQUESTED, limit: 1 },
    { pollingInterval: 60000, skipPollingIfUnfocused: true },
  );

  const { data: exceptionsData } = useGetExceptionsQuery(
    { status: ExceptionStatus.OPEN },
    { pollingInterval: 60000, skipPollingIfUnfocused: true },
  );

  const { data: reconciliationsData } = useGetPendingReconciliationsQuery(undefined, {
    pollingInterval: 60000,
    skipPollingIfUnfocused: true,
  });

  const { data: opsData } = useGetOperationalAnalyticsQuery();

  const pendingPayoutsCount = payoutsData?.data?.total ?? 0;
  const openExceptionsCount = exceptionsData?.data?.length ?? 0;
  const pendingReconCount = reconciliationsData?.data?.length ?? 0;
  const activeRidersCount = opsData?.data?.activeRidersCount ?? 0;

  const queues = [
    {
      id: "payouts",
      title: "Payout Requests Awaiting Approval",
      count: pendingPayoutsCount,
      countLabel: "Pending Requests",
      href: "/admin/finance/payouts",
      icon: Wallet,
      tone: pendingPayoutsCount > 0 ? "warning" : "muted",
      actionText: "Review Queue",
      description: "Merchant withdrawal requests requiring finance authorization",
    },
    {
      id: "exceptions",
      title: "Open Hub Operational Exceptions",
      count: openExceptionsCount,
      countLabel: "Active Incidents",
      href: "/hub/exceptions",
      icon: AlertTriangle,
      tone: openExceptionsCount > 0 ? "danger" : "muted",
      actionText: "Triage Incidents",
      description: "Damaged, misplaced, or delayed parcels requiring intervention",
    },
    {
      id: "cash",
      title: "Pending Cash Reconciliations",
      count: pendingReconCount,
      countLabel: "Unverified Batches",
      href: "/hub/cash",
      icon: Clock,
      tone: pendingReconCount > 0 ? "info" : "muted",
      actionText: "Audit Cash Desk",
      description: "Rider doorstep cash collected awaiting physical verification",
    },
    {
      id: "fleet",
      title: "Active Delivery Fleet On-Duty",
      count: activeRidersCount,
      countLabel: "Riders on Road",
      href: ADMIN_ROUTES.rider,
      icon: Users,
      tone: "success",
      actionText: "View Fleet",
      description: "Couriers currently active across all distribution hubs",
    },
  ];

  return (
    <section aria-label="Supervisory Action Queues" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-extrabold tracking-tight text-foreground">
            Supervisory Triage & Action Queues
          </h2>
          <Badge variant="primary-soft" className="text-[10px] font-bold">
            Live Telemetry
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Auto-refreshes every 60s
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((q) => {
          const Icon = q.icon;
          const isUrgent = q.count > 0 && (q.tone === "danger" || q.tone === "warning");

          return (
            <div
              key={q.id}
              className={`flex flex-col justify-between rounded-2xl bg-card p-4.5 transition-all duration-200 hover:-translate-y-0.5 ${
                isUrgent ? "border-l-4 border-l-warning" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      q.tone === "danger"
                        ? "bg-danger/10 text-danger"
                        : q.tone === "warning"
                          ? "bg-warning/10 text-warning"
                          : q.tone === "success"
                            ? "bg-success/10 text-success"
                            : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>

                  <span
                    className={`font-mono text-xl font-black ${
                      q.count > 0 ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {q.count}
                  </span>
                </div>

                <h3 className="mt-3 text-xs font-bold text-foreground line-clamp-1">
                  {q.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {q.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40">
                <Link href={q.href} className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full text-[11px] font-bold justify-between px-2.5 rounded-xl hover:text-primary"
                  >
                    <span>{q.actionText}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
