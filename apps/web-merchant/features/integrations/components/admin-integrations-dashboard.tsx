"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Button } from "@dhruto/ui";
import { toast } from "sonner";
import {
  useGetIntegrationOverviewQuery,
  useListIntegrationFailuresQuery,
  useReplayIntegrationFailureMutation,
  useResolveIntegrationFailureMutation,
  useGetOutboxOverviewQuery,
  useReplayOutboxEventMutation,
} from "../api/integrations.api";
import { SystemObservabilityCard } from "@/features/observability/components/system-observability-card";
import { useTestSmsNotificationMutation } from "@/features/notifications/api/notifications.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { PageHeader } from "@/components/page-header";
import { AdminIllustrationBg } from "@/components/visual/illustration-backgrounds";
import { IntegrationTelemetryGrid } from "./admin/integration-telemetry-grid";
import { IntegrationQueuesCard } from "./admin/integration-queues-card";
import { IntegrationDlqTable } from "./admin/integration-dlq-table";
import { IntegrationOutboxCard } from "./admin/integration-outbox-card";
import { TestSmsDialog } from "./admin/test-sms-dialog";

/** Admin-only operational view: queues, providers, dead-letter + outbox replay. */
export function AdminIntegrationsDashboard() {
  const t = useTranslations("AdminIntegrations");
  const [failurePage, setFailurePage] = React.useState(1);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [testSmsOpen, setTestSmsOpen] = React.useState(false);
  const [testPhone, setTestPhone] = React.useState("");
  const [testMessage, setTestMessage] = React.useState("Dhruto Gateway Diagnostic: SMS infrastructure ping.");

  const overview = useGetIntegrationOverviewQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });
  const failures = useListIntegrationFailuresQuery({ page: failurePage, limit: 20 });
  const outbox = useGetOutboxOverviewQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });

  const [replay, { isLoading: isReplaying }] = useReplayIntegrationFailureMutation();
  const [resolve, { isLoading: isResolving }] = useResolveIntegrationFailureMutation();
  const [replayOutbox, { isLoading: isReplayingOutbox }] = useReplayOutboxEventMutation();
  const [testSms, { isLoading: isTestingSms }] = useTestSmsNotificationMutation();

  const data = overview.data?.data;
  const failureItems = failures.data?.data?.items ?? [];
  const failureTotal = failures.data?.data?.total ?? 0;
  const failurePages = Math.max(1, Math.ceil(failureTotal / 20));
  const outboxData = outbox.data?.data;

  const handleTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;
    try {
      await testSms({ phone: testPhone.trim(), message: testMessage.trim() }).unwrap();
      toast.success(t("testSmsSuccess"));
      setTestSmsOpen(false);
      setTestPhone("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("testSmsFailed")));
    }
  };

  const handleReplay = async (id: string) => {
    setFeedback(null);
    try {
      await replay(id).unwrap();
      failures.refetch();
      overview.refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("replayFailed")));
    }
  };

  const handleResolve = async (id: string) => {
    setFeedback(null);
    try {
      await resolve(id).unwrap();
      failures.refetch();
      overview.refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("resolveFailed")));
    }
  };

  const handleOutboxReplay = async (id: string) => {
    setFeedback(null);
    try {
      await replayOutbox(id).unwrap();
      outbox.refetch();
      overview.refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("replayFailed")));
    }
  };

  return (
    <div className="relative w-full space-y-6">
      <AdminIllustrationBg opacity={0.35} />

      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestSmsOpen(true)}
              className="h-10 gap-2 text-xs"
            >
              <Smartphone className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("testSms")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                overview.refetch();
                failures.refetch();
                outbox.refetch();
              }}
              className="h-10 gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("refresh")}
            </Button>
          </div>
        }
      />

      {feedback && (
        <div
          role="alert"
          className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
        >
          {feedback}
        </div>
      )}

      {/* System Telemetry & Health Probe Cockpit */}
      <SystemObservabilityCard />

      {overview.isLoading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground rounded-3xl bg-surface-elevated">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          {t("loading")}
        </div>
      ) : overview.isError || !data ? (
        <div className="space-y-3 p-6 text-center rounded-3xl bg-surface-elevated">
          <XCircle className="mx-auto h-8 w-8 text-danger" aria-hidden="true" />
          <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("loadErrorDescription")}</p>
          <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <>
          <IntegrationTelemetryGrid data={data} />
          <IntegrationQueuesCard queues={data.queues} />
        </>
      )}

      <IntegrationDlqTable
        isLoading={failures.isLoading}
        failureItems={failureItems}
        failureTotal={failureTotal}
        failurePage={failurePage}
        failurePages={failurePages}
        setFailurePage={setFailurePage}
        onReplay={handleReplay}
        onResolve={handleResolve}
        isReplaying={isReplaying}
        isResolving={isResolving}
      />

      <IntegrationOutboxCard
        isLoading={outbox.isLoading}
        outboxData={outboxData}
        onReplay={handleOutboxReplay}
        isReplaying={isReplayingOutbox}
      />

      <TestSmsDialog
        open={testSmsOpen}
        onOpenChange={setTestSmsOpen}
        onSubmit={handleTestSms}
        testPhone={testPhone}
        setTestPhone={setTestPhone}
        testMessage={testMessage}
        setTestMessage={setTestMessage}
        isTestingSms={isTestingSms}
      />
    </div>
  );
}
