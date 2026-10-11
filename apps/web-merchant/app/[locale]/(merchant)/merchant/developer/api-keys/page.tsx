"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Code2,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Radio,
  Lock,
} from "lucide-react";
import { Button, Card, Badge } from "@dhruto/ui";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Link } from "@/lib/navigation";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";

export default function MerchantApiKeysPage() {
  const t = useTranslations("Nav");
  const { user } = useAppSelector((state) => state.auth);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [activeCodeLang, setActiveCodeLang] = useState<"curl" | "node" | "python">("curl");

  // Synthetic merchant client credentials
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

  const codeSnippets = {
    curl: `# 1. Create a Shipment
curl -X POST https://api.dhruto.com/api/v1/parcels \\
  -H "Authorization: Bearer ${apiKeySecret}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipientName": "Tanvir Ahmed",
    "recipientPhone": "01712345678",
    "deliveryAddress": "House 12, Road 4, Dhanmondi",
    "thana": "Dhanmondi",
    "district": "Dhaka",
    "weight": 1.5,
    "codAmount": 2500,
    "parcelDescription": "Premium Leather Bag"
  }'`,
    node: `// Node.js (fetch)
const response = await fetch("https://api.dhruto.com/api/v1/parcels", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKeySecret}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    recipientName: "Tanvir Ahmed",
    recipientPhone: "01712345678",
    deliveryAddress: "House 12, Road 4, Dhanmondi",
    thana: "Dhanmondi",
    district: "Dhaka",
    weight: 1.5,
    codAmount: 2500,
    parcelDescription: "Premium Leather Bag"
  })
});

const data = await response.json();
console.log("Tracking Code:", data.data.trackingCode);`,
    python: `# Python (requests)
import requests

url = "https://api.dhruto.com/api/v1/parcels"
headers = {
    "Authorization": "Bearer ${apiKeySecret}",
    "Content-Type": "application/json"
}
payload = {
    "recipientName": "Tanvir Ahmed",
    "recipientPhone": "01712345678",
    "deliveryAddress": "House 12, Road 4, Dhanmondi",
    "thana": "Dhanmondi",
    "district": "Dhaka",
    "weight": 1.5,
    "codAmount": 2500,
    "parcelDescription": "Premium Leather Bag"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
  };

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Developer API Keys & REST Integration"
        description="Manage your programmatic merchant credentials, view REST API endpoints, and integrate Dhruto directly into your e-commerce platform or ERP."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/merchant/developer/webhooks">
              <Button variant="outline" size="sm" className="h-10 gap-2 text-xs">
                <Radio className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Webhooks Simulator</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Credentials Card */}
      <Card className="p-6 sm:p-8 space-y-6 rounded-3xl border-border/80 shadow-soft">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Key className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Live Production Credentials</h3>
              <p className="text-xs text-muted-foreground">
                These credentials grant programmatic access to create bookings and query shipments.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
            LIVE ENVIRONMENT
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 pt-2">
          {/* Client ID */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Client ID
            </label>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted p-3">
              <span className="font-mono text-sm text-foreground">{merchantClientId}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(merchantClientId, "Client ID")}
                className="h-8 w-8 p-0"
              >
                {copiedKey === "Client ID" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                API Secret Key
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
              >
                {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showSecret ? "Hide Secret" : "Reveal Secret"}</span>
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted p-3">
              <span className="font-mono text-sm text-foreground">
                {showSecret ? apiKeySecret : "••••••••••••••••••••••••••••••••"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(apiKeySecret, "API Secret")}
                  className="h-8 w-8 p-0"
                >
                  {copiedKey === "API Secret" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRotateDialogOpen(true)}
                  className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600"
                  title="Rotate / Regenerate Secret"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Alert Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground">
          <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Keep your API Secret secure:</strong> Never expose this key in public client-side JavaScript, mobile app code, or public GitHub repositories. If you believe your key has leaked, regenerate it immediately.
          </p>
        </div>
      </Card>

      {/* Code Snippets & Quickstart */}
      <Card className="p-6 sm:p-8 space-y-6 rounded-3xl border-border/80 shadow-soft">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500">
              <Terminal className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">REST API Quickstart</h3>
              <p className="text-xs text-muted-foreground">
                Copy and run production-ready code snippets with your active merchant credentials.
              </p>
            </div>
          </div>

          {/* Language Switcher Buttons */}
          <div className="flex items-center rounded-xl border border-border p-1 bg-surface-muted">
            {(["curl", "node", "python"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveCodeLang(lang)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase transition-all ${
                  activeCodeLang === lang
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Code Box */}
        <div className="relative rounded-2xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(codeSnippets[activeCodeLang], "Code snippet")}
            className="absolute top-3 right-3 h-7 gap-1 px-2.5 text-[11px] bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
          >
            {copiedKey === "Code snippet" ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span>Copy</span>
          </Button>
          <pre className="pr-16 leading-relaxed">{codeSnippets[activeCodeLang]}</pre>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          <div className="rounded-2xl border border-border/80 bg-surface-muted p-4 space-y-1.5">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-primary" />
              Interactive Swagger Docs
            </p>
            <p className="text-[11px] text-muted-foreground">
              Explore live OpenAPI 3.0 schemas, test requests, and payload validators.
            </p>
            <a
              href="http://localhost:4000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
            >
              Open Swagger UI <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface-muted p-4 space-y-1.5">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-emerald-500" />
              Webhook Subscriptions
            </p>
            <p className="text-[11px] text-muted-foreground">
              Configure real-time event webhooks with HMAC-SHA256 signature verification.
            </p>
            <Link
              href="/merchant/developer/webhooks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
            >
              Manage Webhooks <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface-muted p-4 space-y-1.5">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-cyan-500" />
              Escrow & Rate Limits
            </p>
            <p className="text-[11px] text-muted-foreground">
              Standard tier allows 120 req/min with automatic idempotency cache keys.
            </p>
            <Link
              href="/merchant/calculator"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1"
            >
              {t("calculator")} <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Secret Rotation Confirmation Dialog */}
      <ConfirmDialog
        open={rotateDialogOpen}
        onOpenChange={setRotateDialogOpen}
        title="Regenerate API Secret Key?"
        description="Generating a new secret will immediately invalidate the current key. Any external apps or servers actively calling the API with the old key will receive 401 Unauthorized until updated."
        confirmLabel="Regenerate Secret"
        cancelLabel="Keep Current Key"
        tone="danger"
        onConfirm={handleRotateKey}
      />
    </div>
  );
}
