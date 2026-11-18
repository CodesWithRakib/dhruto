"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@dhruto/ui";
import {
  Warehouse,
  User,
  MapPin,
  ScanLine,
  Truck,
  Package,
  Wallet,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useActiveHub } from "../hooks/use-active-hub";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";
import { CopyButton } from "@/components/data-display/copy-button";

export function HubSettingsView() {
  const t = useTranslations("Hub.settings");
  const authUser = useAppSelector((s) => s.auth.user);
  const { activeHub, refetch } = useActiveHub();

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="relative overflow-hidden bg-card/90 backdrop-blur-md">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                <Warehouse className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {activeHub?.name || "Sorting Hub"}
                  </h2>
                  <Badge variant="outline" className="bg-success/10 text-success">
                    {t("activeStation")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("stationCode")}: <span className="font-mono font-semibold">{activeHub?.code || "HUB-DHK"}</span> • {activeHub?.district || "Dhaka"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 rounded-xl text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t("refreshStation")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hub Station Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="relative overflow-hidden bg-card/90 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" />
                {t("stationOperations")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("stationOperationsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-muted/50 p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("stationName")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground">{activeHub?.name || "Dhaka Central"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {activeHub?.address || "Central Sorting Center"}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-muted/50 p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("stationCode")}
                  </p>
                  <div className="mt-1 flex items-center justify-between font-mono text-sm font-bold text-foreground">
                    <span>{activeHub?.code || "N/A"}</span>
                    {activeHub?.code ? (
                      <CopyButton
                        value={activeHub.code}
                        label={t("copyHubCode")}
                        copiedLabel={t("copied")}
                        errorLabel={t("error")}
                        size="sm"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{authUser?.name || "Hub Operator"}</p>
                    <p className="text-xs text-muted-foreground">{authUser?.email} • {t("role")}: {authUser?.role || "HUB_MANAGER"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational Shortcuts */}
        <div className="space-y-6">
          <Card className="relative overflow-hidden bg-card/90 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t("hubWorkflows")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={HUB_ROUTES.scanner}
                className="flex items-center justify-between rounded-2xl bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <ScanLine className="h-4 w-4 text-primary" />
                  <span>{t("inboundScanner")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={HUB_ROUTES.bags}
                className="flex items-center justify-between rounded-2xl bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-primary" />
                  <span>{t("bagManagement")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={HUB_ROUTES.manifests}
                className="flex items-center justify-between rounded-2xl bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>{t("manifestsTransit")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                href={HUB_ROUTES.cash}
                className="flex items-center justify-between rounded-2xl bg-surface p-3 text-xs font-medium text-foreground transition-all hover:bg-surface-muted"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>{t("cashDesk")}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
