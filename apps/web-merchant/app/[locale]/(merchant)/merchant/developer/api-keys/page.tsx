"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { DashboardCanvasBg } from "@/features/dashboard/components/dashboard-canvas-bg";
import { ApiKeysCredentialsCard } from "@/features/developer/components/api-keys-credentials-card";
import { ApiCodeSnippetViewer } from "@/features/developer/components/api-code-snippet-viewer";

export default function MerchantApiKeysPage() {
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
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRotateKey = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const newKey = `dhr_sec_${randomHex}`;
    setApiKeySecret(newKey);
    setRotateDialogOpen(false);
    toast.success("API Secret regenerated successfully. Remember to update your servers.");
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full space-y-8 py-2">
      {/* Tactical Canvas Background with dot matrix & ambient glows */}
      <DashboardCanvasBg />

      {/* Hero Header */}
      <div className="relative z-10">
        <PageHeader
          title="API Keys & Access Tokens"
          description="Authenticate automated shipments, warehouse order sync, and logistics data pipelines."
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
        title="Rotate Secret Key?"
        description="Are you sure you want to rotate your API Secret? Any active scripts or server integrations currently using the old secret will fail immediately until updated."
        confirmLabel="Yes, Generate New Secret"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={handleRotateKey}
      />
    </div>
  );
}
