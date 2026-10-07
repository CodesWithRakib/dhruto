"use client";

import React, { useState } from "react";
import {
  Webhook,
  Plus,
  Send,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Code2,
  ShieldCheck,
  X,
  Loader2,
  Radio,
  FileCode,
} from "lucide-react";
import { Button, Badge, Card, DataTable } from "@dhruto/ui";
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
import { WebhookEvent, WebhookDeliveryStatus, type WebhookDeliveryItem } from "@dhruto/contracts";
import type { DataTableRow } from "@/lib/data-table";
import { getApiErrorMessage } from "@/lib/api-error";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/confirm-dialog";

const AVAILABLE_EVENTS = [
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

export default function WebhooksDeveloperPage() {
  const t = useTranslations("Webhooks");
  /**
   * Destructive actions never call the API straight from the button: they open
   * the shared confirm dialog first, which owns the loading state, blocks
   * duplicate submits and surfaces the API error if the call fails.
   */
  const [pendingAction, setPendingAction] = React.useState<
    { type: "rotate"; id: string } | { type: "delete"; id: string } | null
  >(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [inspectDelivery, setInspectDelivery] = useState<WebhookDeliveryItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Create form state
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    WebhookEvent.PARCEL_CREATED,
    WebhookEvent.PARCEL_DELIVERED,
    WebhookEvent.CASH_VERIFIED,
    WebhookEvent.PING,
  ]);
  const [customSecret, setCustomSecret] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
  const [freshSecret, setFreshSecret] = React.useState<{ id: string; secret: string } | null>(null);

  const subscriptions = subsData?.data || [];
  const deliveryPayload = deliveriesData?.data as
    { items: WebhookDeliveryItem[]; total: number } | WebhookDeliveryItem[] | undefined;
  const deliveries: WebhookDeliveryItem[] = Array.isArray(deliveryPayload)
    ? deliveryPayload
    : (deliveryPayload?.items ?? []);

  const filteredDeliveries = deliveries.filter((d) => {
    if (filterStatus === "ALL") return true;
    return d.status === filterStatus;
  });

  const totalDeliveries = deliveries.length;
  const deliveredCount = deliveries.filter(
    (d) => d.status === WebhookDeliveryStatus.DELIVERED,
  ).length;
  const deadLetterCount = deliveries.filter(
    (d) => d.status === WebhookDeliveryStatus.DEAD_LETTER,
  ).length;
  const successRate =
    totalDeliveries > 0 ? Math.round((deliveredCount / totalDeliveries) * 100) : 100;

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySecret = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecretId(id);
    setTimeout(() => setCopiedSecretId(null), 2000);
  };

  const handleToggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedEvents.length === 0) {
      setFormError("Please select at least one event to subscribe to.");
      return;
    }

    try {
      const created = await createSub({
        url,
        description: description || undefined,
        events: selectedEvents,
        secret: customSecret.trim() ? customSecret.trim() : undefined,
      }).unwrap();

      // Full secret is returned exactly once on create — surface it immediately.
      if (created.data?.secret) {
        setFreshSecret({ id: created.data.id, secret: created.data.secret });
      }

      setUrl("");
      setDescription("");
      setCustomSecret("");
      setShowCreateModal(false);
      refetchSubs();
    } catch (err) {
      setFormError(getApiErrorMessage(err, t("registerFailed")));
    }
  };

  const handleRotateSecret = (id: string) => {
    setPendingAction({ type: "rotate", id });
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

  const handleDeleteSubscription = (id: string) => {
    setPendingAction({ type: "delete", id });
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
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {freshSecret && (
        <div
          role="alert"
          className="rounded-xl border border-warning bg-warning-soft p-4 text-sm text-warning-soft-foreground"
        >
          <p className="font-semibold">
            Signing secret — shown once. Copy it now; it will never be displayed again.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-background px-2 py-1 font-mono text-xs select-all">
              {freshSecret.secret}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(freshSecret.secret);
                setCopiedSecretId(freshSecret.id);
                setTimeout(() => setCopiedSecretId(null), 2000);
              }}
            >
              {copiedSecretId === freshSecret.id ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFreshSecret(null)}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary-soft text-primary">
              <Webhook className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Webhooks & Integrations</h1>
            <Badge
              variant="outline"
              className="text-xs bg-primary-soft text-primary border-primary"
            >
              v1.0 Live
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
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
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            id="register-webhook-btn"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Register Webhook
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-xs border">
          <span className="text-xs text-muted-foreground font-medium">Configured Endpoints</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold">{subscriptions.length}</span>
            <Badge variant="secondary" className="text-xs text-success bg-success-soft">
              Active
            </Badge>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-xs border">
          <span className="text-xs text-muted-foreground font-medium">Delivery Success Rate</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-success">{successRate}%</span>
            <span className="text-xs text-muted-foreground">
              {deliveredCount}/{totalDeliveries} delivered
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-xs border">
          <span className="text-xs text-muted-foreground font-medium">
            Total Dispatches (Logged)
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold">{totalDeliveries}</span>
            <Radio className="h-4 w-4 text-primary animate-pulse" />
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-xs border">
          <span className="text-xs text-muted-foreground font-medium">Dead Letter Queue (DLQ)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span
              className={`text-2xl font-bold ${deadLetterCount > 0 ? "text-warning" : "text-muted-foreground"}`}
            >
              {deadLetterCount}
            </span>
            {deadLetterCount > 0 ? (
              <Badge variant="destructive" className="text-xs">
                Needs Attention
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs text-success">
                Clean
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Webhook Endpoints List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Active Subscriptions</h2>
          <span className="text-xs text-muted-foreground">
            Signed with X-Dhruto-Signature (HMAC-SHA256)
          </span>
        </div>

        {isLoadingSubs ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Loading webhook subscriptions...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Webhook className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-base mb-1">No webhook endpoints configured</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Add your server endpoint URL to receive automated HTTP notifications whenever parcels
              are created, delivered, or settled.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Register Your First Webhook
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {subscriptions.map((sub) => {
              const isRevealed = !!revealedSecrets[sub.id];
              const isCopied = copiedSecretId === sub.id;

              return (
                <Card
                  key={sub.id}
                  id={`webhook-sub-${sub.id}`}
                  className="p-5 border bg-card/80 backdrop-blur-xs relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-foreground break-all">
                          {sub.url}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[11px] bg-success-soft text-success border-success"
                        >
                          {sub.status}
                        </Badge>
                        {sub.failureCount > 0 && (
                          <Badge variant="destructive" className="text-[11px]">
                            {sub.failureCount} recent failure(s)
                          </Badge>
                        )}
                      </div>

                      {sub.description && (
                        <p className="text-xs text-muted-foreground">{sub.description}</p>
                      )}

                      {/* Secret Key Bar — list responses carry only the masked preview */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border max-w-xl">
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium shrink-0">Signing Secret:</span>
                        <span
                          className="font-mono text-xs truncate select-all"
                          title={sub.secretPreview || "Masked preview"}
                        >
                          {isRevealed
                            ? sub.secretPreview || sub.secret
                            : "••••••••••••••••••••••••••••••••"}
                        </span>
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <button
                            onClick={() => toggleRevealSecret(sub.id)}
                            className="p-1 hover:text-foreground rounded transition-colors"
                            title={isRevealed ? "Hide preview" : "Reveal masked preview"}
                            aria-label={
                              isRevealed ? "Hide secret preview" : "Reveal secret preview"
                            }
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleCopySecret(sub.id, sub.secretPreview || sub.secret)
                            }
                            className="p-1 hover:text-foreground rounded transition-colors"
                            title="Copy masked preview"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Full secret is shown only once at creation/rotation. Use Rotate to issue a
                        new one.
                      </p>

                      {/* Subscribed Events */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-xs text-muted-foreground">Events:</span>
                        {sub.events.map((evt) => (
                          <Badge
                            key={evt}
                            variant="outline"
                            className="text-[10px] font-mono font-normal bg-background"
                          >
                            {evt}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-start">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPinging}
                        onClick={() => handlePing(sub.id)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Send className="h-3.5 w-3.5 text-info" />
                        Test Ping
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isRotating}
                        onClick={() => handleRotateSecret(sub.id)}
                        className="flex items-center gap-1.5 text-xs"
                        title="Rotate signing secret (old secret stops working)"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Rotate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(sub.id, sub.status)}
                        className="flex items-center gap-1.5 text-xs"
                        title={sub.status === "ACTIVE" ? "Disable endpoint" : "Enable endpoint"}
                      >
                        {sub.status === "ACTIVE" ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isDeleting}
                        onClick={() => handleDeleteSubscription(sub.id)}
                        className="text-muted-foreground hover:text-destructive p-2"
                        title="Delete subscription"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivery Logs & Dead Letter Queue */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Delivery Audit Logs & Dead Letter Queue
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time audit trail of outbound HTTP dispatches with retry logs and automatic
              backoff.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border text-xs">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === "ALL"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({deliveries.length})
            </button>
            <button
              onClick={() => setFilterStatus(WebhookDeliveryStatus.DELIVERED)}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === WebhookDeliveryStatus.DELIVERED
                  ? "bg-background text-success"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Delivered ({deliveredCount})
            </button>
            <button
              onClick={() => setFilterStatus(WebhookDeliveryStatus.FAILED)}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === WebhookDeliveryStatus.FAILED
                  ? "bg-background text-danger"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Failed ({deliveries.filter((d) => d.status === WebhookDeliveryStatus.FAILED).length})
            </button>
            <button
              onClick={() => setFilterStatus(WebhookDeliveryStatus.DEAD_LETTER)}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === WebhookDeliveryStatus.DEAD_LETTER
                  ? "bg-background text-warning"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dead Letter ({deadLetterCount})
            </button>
          </div>
        </div>

        {isLoadingDeliveries ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <span className="text-xs">Fetching delivery records...</span>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border rounded-xl bg-card/40">
            <FileCode className="h-8 w-8 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-medium">No webhook deliveries found</p>
            <p className="text-[11px] text-muted-foreground/80 mt-1">
              Test ping or book a parcel to generate real-time webhook events.
            </p>
          </div>
        ) : (
          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                columns={[
                  {
                    accessorKey: "event",
                    header: "Event",
                    cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => (
                      <span className="font-mono font-medium text-foreground">
                        {row.original.event}
                      </span>
                    ),
                  },
                  {
                    accessorKey: "status",
                    header: "Status",
                    cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => {
                      const isDelivered = row.original.status === WebhookDeliveryStatus.DELIVERED;
                      const isDeadLetter =
                        row.original.status === WebhookDeliveryStatus.DEAD_LETTER;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isDelivered
                              ? "bg-success-soft text-success border-success"
                              : isDeadLetter
                                ? "bg-warning-soft text-warning border-warning"
                                : "bg-danger-soft text-danger border-danger"
                          }`}
                        >
                          {isDelivered && <CheckCircle2 className="h-3 w-3" />}
                          {isDeadLetter && <AlertTriangle className="h-3 w-3" />}
                          {row.original.status}
                        </span>
                      );
                    },
                  },
                  {
                    accessorKey: "statusCode",
                    header: "Response Code",
                    cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => (
                      <span className="font-mono">
                        {row.original.statusCode ? (
                          <span
                            className={
                              row.original.statusCode >= 200 && row.original.statusCode < 300
                                ? "text-success font-semibold"
                                : "text-danger font-semibold"
                            }
                          >
                            HTTP {row.original.statusCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Error / Timeout</span>
                        )}
                      </span>
                    ),
                  },
                  {
                    accessorKey: "attemptCount",
                    header: "Attempts",
                    cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => (
                      <span className="font-mono text-muted-foreground">
                        {row.original.attemptCount} / 3
                      </span>
                    ),
                  },
                  {
                    accessorKey: "createdAt",
                    header: "Timestamp",
                    cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => (
                      <span className="text-muted-foreground">
                        {new Date(row.original.createdAt).toLocaleString()}
                      </span>
                    ),
                  },
                  {
                    id: "actions",
                    header: () => <span className="text-right block">Actions</span>,
                    cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => {
                      const item = row.original;
                      const isDelivered = item.status === WebhookDeliveryStatus.DELIVERED;
                      return (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInspectDelivery(item)}
                            className="h-7 text-xs px-2 flex items-center gap-1"
                          >
                            <Code2 className="h-3 w-3 text-primary" />
                            Payload
                          </Button>
                          {!isDelivered && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isRetrying}
                              onClick={() => handleRetry(item.id)}
                              className="h-7 text-xs px-2 flex items-center gap-1 text-warning hover:text-warning"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Replay
                            </Button>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
                data={filteredDeliveries}
                isLoading={isLoadingDeliveries}
              />
            </div>
          </div>
        )}
      </div>

      {/* Register Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border rounded-xl max-w-xl w-full p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-primary-soft text-primary">
                <Webhook className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Register Webhook Endpoint</h3>
                <p className="text-xs text-muted-foreground">
                  Deliveries include HMAC-SHA256 signature header for verification.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1">
                  Destination URL <span className="text-danger">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://api.yourdomain.com/webhooks/dhruto"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  Description / Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production ERP Sync"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Subscribed Events <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-xl p-3 bg-muted/20 max-h-48 overflow-y-auto">
                  {AVAILABLE_EVENTS.map(({ event, label, desc }) => {
                    const checked = selectedEvents.includes(event);
                    return (
                      <label
                        key={event}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "bg-primary-soft border-primary text-foreground"
                            : "bg-card border-transparent text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleEvent(event)}
                          className="mt-0.5 rounded text-primary focus:ring-ring"
                        />
                        <div>
                          <span className="font-mono font-medium block text-foreground">
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
                <label className="text-xs font-medium block mb-1">Custom Secret (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate secure dhr_whsec_... key"
                  value={customSecret}
                  onChange={(e) => setCustomSecret(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 font-mono text-xs"
                />
              </div>

              {formError && (
                <div className="text-xs p-2.5 rounded-lg bg-danger-soft border border-danger text-danger">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground flex items-center gap-1.5"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Register Endpoint
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payload Inspector Modal */}
      {inspectDelivery && (
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border rounded-xl max-w-2xl w-full p-6 relative animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setInspectDelivery(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Delivery Payload Inspector</h3>
                <p className="text-xs font-mono text-muted-foreground">
                  Event: {inspectDelivery.event} · Delivery ID: {inspectDelivery.id}
                </p>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1">
                  Outbound Request Headers
                </span>
                <div className="bg-muted/40 p-3 rounded-lg border font-mono text-xs space-y-1">
                  <div>
                    <span className="text-primary">X-Dhruto-Event:</span> {inspectDelivery.event}
                  </div>
                  <div>
                    <span className="text-primary">X-Dhruto-Delivery:</span> {inspectDelivery.id}
                  </div>
                  <div className="break-all">
                    <span className="text-primary">X-Dhruto-Signature:</span>{" "}
                    {inspectDelivery.signature}
                  </div>
                  <div>
                    <span className="text-primary">Content-Type:</span> application/json
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1">
                  JSON Body Payload
                </span>
                <pre className="bg-muted/40 p-3 rounded-lg border font-mono text-xs overflow-x-auto text-foreground">
                  {JSON.stringify(inspectDelivery.payload, null, 2)}
                </pre>
              </div>

              {inspectDelivery.responseBody && (
                <div>
                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-1">
                    Destination Server Response
                  </span>
                  <pre className="bg-muted/40 p-3 rounded-lg border font-mono text-xs overflow-x-auto text-muted-foreground">
                    {inspectDelivery.responseBody}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <Button size="sm" variant="outline" onClick={() => setInspectDelivery(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
