"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Code2, Copy, ExternalLink, Terminal } from "lucide-react";
import { Button } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { toast } from "sonner";

interface ApiCodeSnippetViewerProps {
  apiKeySecret: string;
}

export function ApiCodeSnippetViewer({ apiKeySecret }: ApiCodeSnippetViewerProps) {
  const t = useTranslations("Developer");
  const [activeCodeLang, setActiveCodeLang] = useState<"curl" | "node" | "python">("curl");
  const [snippetCopied, setSnippetCopied] = useState(false);

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
print("Tracking Code:", response.json()["data"]["trackingCode"])`,
  };

  const handleCopySnippet = () => {
    void navigator.clipboard.writeText(codeSnippets[activeCodeLang]);
    setSnippetCopied(true);
    toast.success(t("snippetCopied", { lang: activeCodeLang.toUpperCase() }));
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/90 p-6 sm:p-8 backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-body font-bold text-foreground">{t("quickstartTitle")}</h3>
            <p className="text-caption text-muted-foreground">{t("quickstartDesc")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Lang switcher */}
          <div className="flex items-center rounded-xl bg-surface-muted/60 p-1">
            {(["curl", "node", "python"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveCodeLang(lang)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeCodeLang === lang
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "curl" ? "cURL" : lang === "node" ? "Node.js" : "Python"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySnippet}
            className="h-8 gap-1.5 text-xs rounded-xl hover:bg-surface-elevated"
          >
            {snippetCopied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{snippetCopied ? "Copied" : "Copy Code"}</span>
          </Button>
        </div>
      </div>

      <div className="relative rounded-2xl bg-inverse p-4 font-mono text-xs text-inverse-foreground overflow-x-auto">
        <pre className="leading-relaxed">{codeSnippets[activeCodeLang]}</pre>
      </div>

      <div className="flex items-center justify-between pt-1 text-caption text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          API Root: <code className="font-mono text-foreground font-semibold">https://api.dhruto.com/api/v1</code>
        </span>
        <Link
          href="/docs"
          className="flex items-center gap-1 text-primary hover:underline font-semibold"
        >
          <span>Full API Reference</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
