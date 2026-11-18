"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Eye, EyeOff, Key, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, Badge } from "@dhruto/ui";

interface ApiKeysCredentialsCardProps {
  merchantClientId: string;
  apiKeySecret: string;
  showSecret: boolean;
  copiedKey: string | null;
  onToggleShowSecret: () => void;
  onCopy: (text: string, label: string) => void;
  onRequestRotate: () => void;
}

export function ApiKeysCredentialsCard({
  merchantClientId,
  apiKeySecret,
  showSecret,
  copiedKey,
  onToggleShowSecret,
  onCopy,
  onRequestRotate,
}: ApiKeysCredentialsCardProps) {
  const t = useTranslations("Developer");

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/90 p-6 sm:p-8 backdrop-blur-md space-y-6">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Key className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-body-md font-bold text-foreground tracking-tight">{t("activeCredentials")}</h2>
            <p className="text-caption text-muted-foreground">{t("credentialsDesc")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-success/10 text-success font-mono">
            {t("envProduction")}
          </Badge>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary font-mono">
            {t("rateLimit")}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {/* Client ID / App ID */}
        <div className="rounded-2xl bg-surface-muted/40 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("publicClientId")}
            </label>
            <span className="text-[11px] font-mono text-muted-foreground">{t("publicClientDesc")}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-body-sm font-semibold text-foreground break-all select-all">
              {merchantClientId}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(merchantClientId, "Client ID")}
              className="gap-1.5 rounded-xl hover:bg-surface-elevated h-8 text-xs font-semibold"
            >
              {copiedKey === "Client ID" ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copiedKey === "Client ID" ? t("copied") : t("copy")}</span>
            </Button>
          </div>
        </div>

        {/* Secret Key */}
        <div className="rounded-2xl bg-surface-muted/40 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-warning" />
              <label className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
                {t("secretKey")}
              </label>
            </div>
            <span className="text-[11px] font-mono text-danger font-semibold">{t("secretKeyDesc")}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-body-sm font-semibold text-foreground break-all select-all">
              {showSecret ? apiKeySecret : "••••••••••••••••••••••••••••••••••••••••••••••••"}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleShowSecret}
              className="h-8 text-xs rounded-xl hover:bg-surface-elevated font-semibold gap-1.5"
            >
              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showSecret ? t("hide") : t("reveal")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(apiKeySecret, "Secret Key")}
              className="gap-1.5 rounded-xl hover:bg-surface-elevated h-8 text-xs font-semibold"
            >
              {copiedKey === "Secret Key" ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copiedKey === "Secret Key" ? t("copied") : t("copy")}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <p className="text-caption text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-success shrink-0" />
          <span>{t("rotateWarning")}</span>
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={onRequestRotate}
          className="gap-1.5 rounded-xl hover:bg-surface-elevated text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-primary" />
          <span>{t("rotateSecret")}</span>
        </Button>
      </div>
    </div>
  );
}
