"use client";

import * as React from "react";
import { Package, RefreshCw, Sparkles } from "lucide-react";
import { Button, Input } from "@dhruto/ui";

interface CustomerTrackInputCardProps {
  onAddTrackingCode: (code: string) => Promise<boolean>;
}

export function CustomerTrackInputCard({ onAddTrackingCode }: CustomerTrackInputCardProps) {
  const [codeInput, setCodeInput] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codeInput.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    const ok = await onAddTrackingCode(trimmed);
    if (ok) {
      setCodeInput("");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card dark:bg-card/90 p-5 shadow-xs">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Package className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Connect any tracking code (e.g. DHR-20261114-NNN27T)..."
            className="pl-10 font-mono text-xs bg-muted/40 dark:bg-background rounded-xl border-border/70 focus:bg-background"
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || !codeInput.trim()}
          className="h-10 shrink-0 text-xs font-semibold gap-1.5 rounded-xl shadow-xs"
        >
          {isSubmitting ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Track & Add to Dashboard
        </Button>
      </form>
    </div>
  );
}
