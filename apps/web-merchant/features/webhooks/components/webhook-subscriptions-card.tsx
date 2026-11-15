"use client";

import React, { useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2, Plus, RefreshCw, Send, ShieldCheck, Trash2, Webhook } from "lucide-react";
import { Button } from "@dhruto/ui";
import type { WebhookSubscriptionItem } from "@dhruto/contracts";

interface WebhookSubscriptionsCardProps {
  subscriptions: WebhookSubscriptionItem[];
  isLoading: boolean;
  onRegisterClick: () => void;
  onPing: (id: string) => void;
  onRotate: (id: string) => void;
  onToggleStatus: (id: string, current: string) => void;
  onDelete: (id: string) => void;
  isPinging: boolean;
  isRotating: boolean;
  isDeleting: boolean;
}

export function WebhookSubscriptionsCard({
  subscriptions,
  isLoading,
  onRegisterClick,
  onPing,
  onRotate,
  onToggleStatus,
  onDelete,
  isPinging,
  isRotating,
  isDeleting,
}: WebhookSubscriptionsCardProps) {
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySecret = (id: string, secret: string) => {
    if (!secret) return;
    void navigator.clipboard.writeText(secret).catch(() => {});
    setCopiedSecretId(id);
    setTimeout(() => setCopiedSecretId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-body-md font-bold tracking-tight text-foreground">Active Subscriptions</h2>
        <span className="text-caption text-muted-foreground font-mono">
          Signed with X-Dhruto-Signature (HMAC-SHA256)
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Loading webhook subscriptions...</span>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="p-8 text-center rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md">
          <Webhook className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-bold text-body-md mb-1 text-foreground">No webhook endpoints configured</h3>
          <p className="text-body-sm text-muted-foreground max-w-md mx-auto mb-4">
            Add your server endpoint URL to receive automated HTTP notifications whenever parcels
            are created, delivered, or settled.
          </p>
          <Button
            onClick={onRegisterClick}
            size="sm"
            className="rounded-xl font-bold shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Register Your First Webhook
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {subscriptions.map((sub) => {
            const isRevealed = !!revealedSecrets[sub.id];
            const isCopied = copiedSecretId === sub.id;

            return (
              <div
                key={sub.id}
                id={`webhook-sub-${sub.id}`}
                className="relative overflow-hidden p-6 rounded-3xl border border-border/80 bg-surface-elevated/90 shadow-sm backdrop-blur-md"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground break-all">
                        {sub.url}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {sub.status}
                      </span>
                      {sub.failureCount > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          {sub.failureCount} recent failure(s)
                        </span>
                      )}
                    </div>

                    {sub.description && (
                      <p className="text-body-sm text-muted-foreground">{sub.description}</p>
                    )}

                    {/* Secret Key Bar */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border/70 bg-surface-muted/60 p-2.5 rounded-2xl max-w-xl">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                      <span className="font-semibold shrink-0">Signing Secret:</span>
                      <span
                        className="font-mono text-xs truncate select-all"
                        title={sub.secretPreview || "Masked preview"}
                      >
                        {isRevealed
                          ? sub.secretPreview || "••••••••••••••••••••••••••••••••"
                          : "••••••••••••••••••••••••••••••••"}
                      </span>
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <button
                          onClick={() => toggleRevealSecret(sub.id)}
                          className="p-1 hover:text-foreground rounded-lg transition-colors"
                          title={isRevealed ? "Hide preview" : "Reveal masked preview"}
                          aria-label={isRevealed ? "Hide secret preview" : "Reveal secret preview"}
                        >
                          {isRevealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopySecret(sub.id, sub.secretPreview)}
                          className="p-1 hover:text-foreground rounded-lg transition-colors"
                          title="Copy masked preview"
                          aria-label="Copy masked secret preview"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
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
                      <span className="text-caption font-semibold text-muted-foreground">Events:</span>
                      {sub.events.map((evt) => (
                        <span
                          key={evt}
                          className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium border border-border/60 bg-surface-muted text-foreground"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-start">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPinging}
                      onClick={() => onPing(sub.id)}
                      className="flex items-center gap-1.5 text-xs rounded-xl border-border/80 hover:bg-surface-elevated font-semibold"
                    >
                      <Send className="h-3.5 w-3.5 text-info" />
                      Test Ping
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRotating}
                      onClick={() => onRotate(sub.id)}
                      className="flex items-center gap-1.5 text-xs rounded-xl border-border/80 hover:bg-surface-elevated font-semibold"
                      title="Rotate signing secret"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      Rotate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleStatus(sub.id, sub.status)}
                      className="flex items-center gap-1.5 text-xs rounded-xl border-border/80 hover:bg-surface-elevated font-semibold"
                    >
                      {sub.status === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isDeleting}
                      onClick={() => onDelete(sub.id)}
                      className="text-muted-foreground hover:text-destructive p-2 rounded-xl"
                      title="Delete subscription"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
