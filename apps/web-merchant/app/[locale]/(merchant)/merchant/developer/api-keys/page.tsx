"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import { ApiKeysCredentialsCard } from "@/features/developer/components/api-keys-credentials-card";
import { ApiCodeSnippetViewer } from "@/features/developer/components/api-code-snippet-viewer";

export default function MerchantApiKeysPage() {
  const t = useTranslations("Developer");
  const { user } = useAppSelector((state) => state.auth);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);

  const merchantClientId = user?.merchantId
    ? `dhr_live_${user.merchantId.slice(0, 8)}`
    : "dhr_live_merchant_default";
  const [apiKeySecret, setApiKeySecret] = useState(
    "dhr_sec_9f8b2a1c4e7d3f5a8b0c2e4f6a8d0b2e",
  );

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(t("toastCopied", { label }));
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRotateKey = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const newKey = `dhr_sec_${randomHex}`;
    setApiKeySecret(newKey);
    setRotateDialogOpen(false);
    toast.success(t("toastRegenerated"));
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-8 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Hero Header */}
      <div className="relative z-10">
        <PageHeader
          title={t("apiKeysTitle")}
          description={t("apiKeysSubtitle")}
        />
      </div>

      <div className="relative z-10 space-y-6">
        <ApiKeysCredentialsCard
          merchantClientId={merchantClientId}
          apiKeySecret={apiKeySecret}
          showSecret={showSecret}
          copiedKey={copiedKey}
          onToggleShowSecret={() => setShowSecret((prev) => !prev)}
          onCopy={copyToClipboard}
          onRequestRotate={() => setRotateDialogOpen(true)}
        />

        <ApiCodeSnippetViewer apiKeySecret={apiKeySecret} />
      </div>

      <ConfirmDialog
        open={rotateDialogOpen}
        onOpenChange={setRotateDialogOpen}
        title={t("rotateTitle")}
        description={t("rotateDesc")}
        confirmLabel={t("rotateConfirm")}
        cancelLabel={t("rotateCancel")}
        tone="danger"
        onConfirm={handleRotateKey}
      />
    </div>
  );
}
