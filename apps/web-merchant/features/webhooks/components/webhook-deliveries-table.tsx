"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  FileCode,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Button, DataTable } from "@dhruto/ui";
import { WebhookDeliveryStatus, type WebhookDeliveryItem } from "@dhruto/contracts";
import type { DataTableRow } from "@/lib/data-table";

interface WebhookDeliveriesTableProps {
  deliveries: WebhookDeliveryItem[];
  /** Server-side totals for the filter tabs (the list holds only the latest page). */
  counts: { all: number; delivered: number; failed: number; deadLetter: number };
  /** Selected tab; the page refetches deliveries for it (server-side filter). */
  filterStatus: "ALL" | WebhookDeliveryStatus;
  onFilterChange: (status: "ALL" | WebhookDeliveryStatus) => void;
  isLoading: boolean;
  onRetry: (deliveryId: string) => void;
  isRetrying: boolean;
}

export function WebhookDeliveriesTable({
  deliveries,
  counts,
  filterStatus,
  onFilterChange,
  isLoading,
  onRetry,
  isRetrying,
}: WebhookDeliveriesTableProps) {
  const [inspectDelivery, setInspectDelivery] = useState<WebhookDeliveryItem | null>(null);

  // Already filtered by the server for the selected tab.
  const filteredDeliveries = deliveries;

  const deliveredCount = counts.delivered;
  const deadLetterCount = counts.deadLetter;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-body-md font-bold tracking-tight text-foreground">
            Delivery Audit Logs & Dead Letter Queue
          </h2>
          <p className="text-caption text-muted-foreground">
            Real-time audit trail of outbound HTTP dispatches with retry logs and automatic
            backoff.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-surface-elevated/90 p-1.5 rounded-2xl text-xs backdrop-blur-md">
          <button
            onClick={() => onFilterChange("ALL")}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
              filterStatus === "ALL"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => onFilterChange(WebhookDeliveryStatus.DELIVERED)}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
              filterStatus === WebhookDeliveryStatus.DELIVERED
                ? "bg-success/15 text-success"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
            }`}
          >
            Delivered ({deliveredCount})
          </button>
          <button
            onClick={() => onFilterChange(WebhookDeliveryStatus.FAILED)}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
              filterStatus === WebhookDeliveryStatus.FAILED
                ? "bg-danger/15 text-danger"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
            }`}
          >
            Failed ({counts.failed})
          </button>
          <button
            onClick={() => onFilterChange(WebhookDeliveryStatus.DEAD_LETTER)}
            className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
              filterStatus === WebhookDeliveryStatus.DEAD_LETTER
                ? "bg-warning/15 text-warning"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
            }`}
          >
            Dead Letter ({deadLetterCount})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          <span className="text-xs">Fetching delivery records...</span>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground rounded-3xl bg-surface-elevated/90 backdrop-blur-md">
          <FileCode className="h-8 w-8 mx-auto opacity-30 mb-2" />
          <p className="text-body-sm font-bold text-foreground">No webhook deliveries found</p>
          <p className="text-caption text-muted-foreground mt-1">
            Test ping or book a parcel to generate real-time webhook events.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-surface-elevated/90 p-4 backdrop-blur-md">
          <div className="overflow-x-auto">
            <DataTable
              columns={[
                {
                  accessorKey: "event",
                  header: "Event",
                  cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => (
                    <span className="font-mono font-bold text-foreground">
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
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDelivered
                            ? "bg-success/10 text-success"
                            : isDeadLetter
                              ? "bg-warning/10 text-warning"
                              : "bg-danger/10 text-danger"
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
                              ? "text-success font-bold"
                              : "text-danger font-bold"
                          }
                        >
                          HTTP {row.original.statusCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Error / Timeout</span>
                      )}
                    </span>
                  ),
                },
                {
                  accessorKey: "attemptCount",
                  header: "Attempts",
                  cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => (
                    <span className="font-mono font-semibold text-muted-foreground">
                      {row.original.attemptCount} / 3
                    </span>
                  ),
                },
                {
                  accessorKey: "createdAt",
                  header: "Timestamp",
                  cell: ({ row }: DataTableRow<WebhookDeliveryItem>) => (
                    <span className="text-caption text-muted-foreground font-mono">
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
                          className="h-7 text-xs px-2.5 rounded-lg flex items-center gap-1 hover:bg-surface-elevated font-semibold"
                        >
                          <Code2 className="h-3.5 w-3.5 text-primary" />
                          Payload
                        </Button>
                        {!isDelivered && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRetrying}
                            onClick={() => onRetry(item.id)}
                            className="h-7 text-xs px-2.5 rounded-lg flex items-center gap-1 text-warning hover:bg-warning/10 font-semibold"
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
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Payload Inspector Modal */}
      {inspectDelivery && (
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-elevated text-card-foreground rounded-3xl max-w-2xl w-full p-6 sm:p-7 relative animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setInspectDelivery(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 pb-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Delivery Payload Inspector</h3>
                <p className="text-caption font-mono text-muted-foreground">
                  Event: {inspectDelivery.event} · Delivery ID: {inspectDelivery.id}
                </p>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <span className="text-caption font-bold uppercase text-muted-foreground tracking-wider block mb-1.5">
                  Outbound Request Headers
                </span>
                <div className="bg-surface-muted/60 p-3.5 rounded-2xl font-mono text-xs space-y-1">
                  <div>
                    <span className="text-primary font-semibold">X-Dhruto-Event:</span> {inspectDelivery.event}
                  </div>
                  <div>
                    <span className="text-primary font-semibold">X-Dhruto-Delivery:</span> {inspectDelivery.id}
                  </div>
                  <div className="break-all">
                    <span className="text-primary font-semibold">X-Dhruto-Signature:</span>{" "}
                    {inspectDelivery.signature}
                  </div>
                  <div>
                    <span className="text-primary font-semibold">Content-Type:</span> application/json
                  </div>
                </div>
              </div>

              <div>
                <span className="text-caption font-bold uppercase text-muted-foreground tracking-wider block mb-1.5">
                  JSON Body Payload
                </span>
                <pre className="bg-inverse p-4 rounded-2xl font-mono text-xs overflow-x-auto text-inverse-foreground">
                  {JSON.stringify(inspectDelivery.payload, null, 2)}
                </pre>
              </div>

              {inspectDelivery.responseBody && (
                <div>
                  <span className="text-caption font-bold uppercase text-muted-foreground tracking-wider block mb-1.5">
                    Destination Server Response
                  </span>
                  <pre className="bg-surface-muted/60 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto text-muted-foreground">
                    {inspectDelivery.responseBody}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4">
              <Button size="sm" variant="outline" onClick={() => setInspectDelivery(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
