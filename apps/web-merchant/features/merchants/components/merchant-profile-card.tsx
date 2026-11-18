"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, RefreshCw, Store } from "lucide-react";
import { Button } from "@dhruto/ui";

interface MerchantProfileCardProps {
  businessName: string;
  email?: string;
  status?: string;
  onRefresh: () => void;
  isFetching: boolean;
}

export function MerchantProfileCard({
  businessName,
  email,
  status = "ACTIVE",
  onRefresh,
  isFetching,
}: MerchantProfileCardProps) {
  const t = useTranslations("Settings");

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/90 p-6 backdrop-blur-md">

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-display-xs sm:text-h3 font-bold tracking-tight text-foreground">
                {businessName}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-success/10 text-success">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {status}
              </span>
            </div>
            <p className="text-body-sm text-muted-foreground">
              {email ? `${email} • ${t("registeredAccount")}` : t("registeredAccount")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="gap-2 rounded-xl text-xs font-semibold hover:bg-surface-elevated"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span>{t("refresh")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
