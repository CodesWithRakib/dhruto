"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { ChatEscalationStatus } from "@dhruto/contracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dhruto/ui";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { usePathname, useRouter } from "@/lib/navigation";
import { useGetStaffProfileQuery } from "../api/chat-admin.api";
import { ChatPermission, can } from "../lib/admin";
import { OverviewPanel } from "./overview-panel";
import { InboxPanel } from "./inbox-panel";
import { ReportsPanel } from "./reports-panel";
import { AttachmentsPanel } from "./attachments-panel";
import { AuditPanel } from "./audit-panel";

const TABS = ["overview", "inbox", "escalations", "reports", "attachments", "audit"] as const;
type Tab = (typeof TABS)[number];

/**
 * Admin Communication Center (Phase 7). Page orchestration only: the tab is
 * kept in the URL (`?tab=`) so refresh/back work; each panel owns its data.
 * Tabs the caller cannot use are hidden (the backend still enforces).
 */
export function CommunicationCenter() {
  const t = useTranslations("ChatAdmin");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const profile = useGetStaffProfileQuery();

  if (profile.isLoading) return <LoadingState title={t("loading")} />;
  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        action={<RetryButton label={t("retry")} onRetry={() => void profile.refetch()} />}
      />
    );
  }
  const p = profile.data;
  if (!can(p, ChatPermission.CONVERSATION_VIEW_ANY)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("unauthorized.title")}
        description={t("unauthorized.description")}
      />
    );
  }

  const visible: Tab[] = TABS.filter((tab) => {
    if (tab === "escalations") return can(p, ChatPermission.ESCALATION_MANAGE);
    if (tab === "reports") return can(p, ChatPermission.REPORT_REVIEW);
    if (tab === "audit") return can(p, ChatPermission.AUDIT_VIEW);
    return true;
  });
  const requested = params.get("tab");
  const active: Tab = visible.find((tab) => tab === requested) ?? "overview";
  const select = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-24 pt-4 sm:px-6 sm:pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <Tabs value={active} onValueChange={select}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList aria-label={t("tabsLabel")}>
            {visible.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-4">
          <OverviewPanel onNavigate={select} />
        </TabsContent>
        <TabsContent value="inbox" className="mt-4">
          <InboxPanel profile={p} />
        </TabsContent>
        {visible.includes("escalations") && (
          <TabsContent value="escalations" className="mt-4">
            <InboxPanel
              profile={p}
              preset={{ escalation: "ACTIVE" }}
              escalationStatuses={Object.values(ChatEscalationStatus)}
            />
          </TabsContent>
        )}
        {visible.includes("reports") && (
          <TabsContent value="reports" className="mt-4">
            <ReportsPanel profile={p} />
          </TabsContent>
        )}
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel profile={p} />
        </TabsContent>
        {visible.includes("audit") && (
          <TabsContent value="audit" className="mt-4">
            <AuditPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
