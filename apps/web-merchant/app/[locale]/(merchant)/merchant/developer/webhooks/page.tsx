"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Webhook,
  Plus,
  RefreshCw,
  X,
  Check,
  Copy,
} from "lucide-react";
import { Button, Badge } from "@dhruto/ui";
import {
  useListWebhookSubscriptionsQuery,
  useCreateWebhookSubscriptionMutation,
  useUpdateWebhookSubscriptionMutation,
  useRotateWebhookSecretMutation,
  useDeleteWebhookSubscriptionMutation,
  usePingWebhookSubscriptionMutation,
  useListWebhookDeliveriesQuery,
  useRetryWebhookDeliveryMutation,
} from "@/features/webhooks/api/webhooks.api";
import { WebhookDeliveryStatus, type WebhookDeliveryItem } from "@dhruto/contracts";
import { getApiErrorMessage } from "@/lib/api-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import { WebhookKpiStrip } from "@/features/webhooks/components/webhook-kpi-strip";
import { WebhookSubscriptionsCard } from "@/features/webhooks/components/webhook-subscriptions-card";
import { WebhookCreateModal } from "@/features/webhooks/components/webhook-create-modal";
import { WebhookDeliveriesTable } from "@/features/webhooks/components/webhook-deliveries-table";

export default function WebhooksDeveloperPage() {
  const t = useTranslations("Webhooks");

  const [pendingAction, setPendingAction] = useState<
    { type: "rotate"; id: string } | { type: "delete"; id: string } | null
  >(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [freshSecret, setFreshSecret] = useState<{ id: string; secret: string } | null>(null);

  // Queries & Mutations
  const {
    data: subsData,
    isLoading: isLoadingSubs,
    refetch: refetchSubs,
  } = useListWebhookSubscriptionsQuery();
  const {
    data: deliveriesData,
    isLoading: isLoadingDeliveries,
    refetch: refetchDeliveries,
  } = useListWebhookDeliveriesQuery(undefined, {
    pollingInterval: 10000,
    skipPollingIfUnfocused: true,
  });

  const [createSub, { isLoading: isCreating }] = useCreateWebhookSubscriptionMutation();
  const [updateSub] = useUpdateWebhookSubscriptionMutation();
  const [rotateSecret, { isLoading: isRotating }] = useRotateWebhookSecretMutation();
  const [deleteSub, { isLoading: isDeleting }] = useDeleteWebhookSubscriptionMutation();
  const [pingSub, { isLoading: isPinging }] = usePingWebhookSubscriptionMutation();
  const [retryDelivery, { isLoading: isRetrying }] = useRetryWebhookDeliveryMutation();

  const subscriptions = subsData?.data || [];
  const deliveryPayload = deliveriesData?.data as
    { items: WebhookDeliveryItem[]; total: number } | WebhookDeliveryItem[] | undefined;
  const deliveries: WebhookDeliveryItem[] = Array.isArray(deliveryPayload)
    ? deliveryPayload
    : (deliveryPayload?.items ?? []);

  const totalDeliveries = deliveries.length;
  const deliveredCount = deliveries.filter(
    (d) => d.status === WebhookDeliveryStatus.DELIVERED,
  ).length;
  const deadLetterCount = deliveries.filter(
    (d) => d.status === WebhookDeliveryStatus.DEAD_LETTER,
  ).length;
  const successRate =
    totalDeliveries > 0 ? Math.round((deliveredCount / totalDeliveries) * 100) : 100;

  const handleCreateSubscription = async (formData: {
    url: string;
    description?: string;
    events: string[];
    secret?: string;
  }) => {
    setFormError(null);
    try {
      const created = await createSub(formData).unwrap();
      if (created.data?.secret) {
        setFreshSecret({ id: created.data.id, secret: created.data.secret });
      }
      setShowCreateModal(false);
      refetchSubs();
    } catch (err) {
      setFormError(getApiErrorMessage(err, t("registerFailed")));
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.type === "rotate") {
      const result = await rotateSecret(pendingAction.id).unwrap();
      if (result.data?.secret) {
        setFreshSecret({ id: pendingAction.id, secret: result.data.secret });
      }
    } else {
      await deleteSub(pendingAction.id).unwrap();
    }
    refetchSubs();
  };

  const handleToggleStatus = async (id: string, current: string) => {
    try {
      await updateSub({
        id,
        payload: { status: current === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
      }).unwrap();
      refetchSubs();
    } catch {
      // Ignore
    }
  };

  const handlePing = async (id: string) => {
    try {
      await pingSub(id).unwrap();
      refetchDeliveries();
    } catch {
      // Ignore
    }
  };

  const handleRetry = async (deliveryId: string) => {
    try {
      await retryDelivery(deliveryId).unwrap();
      refetchDeliveries();
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-8 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {freshSecret && (
        <div
          role="alert"
          className="relative z-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground shadow-sm backdrop-blur-md"
        >
          <p className="font-bold text-amber-700 dark:text-amber-300">
            Signing secret — shown once. Copy it now; it will never be displayed again.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-xl border border-border/80 bg-surface-elevated px-3 py-1.5 font-mono text-xs select-all font-semibold">
              {freshSecret.secret}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(freshSecret.secret);
                setCopiedSecretId(freshSecret.id);
                setTimeout(() => setCopiedSecretId(null), 2000);
              }}
              className="rounded-xl border-border/80 hover:bg-surface-elevated text-xs font-semibold gap-1.5"
            >
              {copiedSecretId === freshSecret.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Copy</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFreshSecret(null)} className="rounded-xl">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dismiss</span>
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Webhook className="h-6 w-6" />
            </div>
            <h1 className="text-display-xs sm:text-display-sm font-bold tracking-tight text-foreground">
              Webhooks & Integrations
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/30 font-mono"
            >
              v1.0 Live
            </Badge>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Configure secure HMAC-SHA256 signed HTTP endpoints to receive real-time updates for
            parcels, COD collections, and payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSubs();
              refetchDeliveries();
            }}
            className="flex items-center gap-1.5 rounded-xl border-border/80 hover:bg-surface-elevated text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            id="register-webhook-btn"
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Register Webhook</span>
          </Button>
        </div>
      </div>

      <div className="relative z-10 space-y-8">
        {/* Metrics Row */}
        <WebhookKpiStrip
          subscriptionCount={subscriptions.length}
          successRate={successRate}
          deliveredCount={deliveredCount}
          totalDeliveries={totalDeliveries}
          deadLetterCount={deadLetterCount}
        />

        {/* Webhook Endpoints List */}
        <WebhookSubscriptionsCard
          subscriptions={subscriptions}
          isLoading={isLoadingSubs}
          onRegisterClick={() => setShowCreateModal(true)}
          onPing={handlePing}
          onRotate={(id) => setPendingAction({ type: "rotate", id })}
          onToggleStatus={handleToggleStatus}
          onDelete={(id) => setPendingAction({ type: "delete", id })}
          isPinging={isPinging}
          isRotating={isRotating}
          isDeleting={isDeleting}
        />

        {/* Delivery Logs & Dead Letter Queue */}
        <WebhookDeliveriesTable
          deliveries={deliveries}
          isLoading={isLoadingDeliveries}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      </div>

      {/* Register Webhook Modal */}
      <WebhookCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubscription}
        isLoading={isCreating}
        formError={formError}
      />

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        tone="danger"
        title={pendingAction?.type === "rotate" ? t("rotateConfirmTitle") : t("deleteConfirmTitle")}
        description={
          pendingAction?.type === "rotate"
            ? t("rotateConfirmDescription")
            : t("deleteConfirmDescription")
        }
        onConfirm={runPendingAction}
      />
    </div>
  );
}
