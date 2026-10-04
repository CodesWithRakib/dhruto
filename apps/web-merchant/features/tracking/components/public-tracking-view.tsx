"use client";

import React, { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
} from "@dhruto/ui";
import { Search, Package, MapPin, Phone, Building2, Clock, AlertCircle } from "lucide-react";
import { useGetPublicTrackingQuery } from "../../parcels/api/parcels.api";

interface PublicTrackingViewProps {
  initialCode?: string;
}

export function PublicTrackingView({ initialCode = "" }: PublicTrackingViewProps) {
  const t = useTranslations("Tracking");
  const locale = useLocale();
  const router = useRouter();

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);

  const { data, isLoading, error } = useGetPublicTrackingQuery(activeCode, {
    skip: !activeCode,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (clean) {
      setActiveCode(clean);
      router.push(`/track/${clean}`);
    }
  };

  const tracking = data?.data;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-2">
        <div className="p-3 bg-primary/10 rounded-2xl w-fit mx-auto text-primary mb-2">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {t("searchTitle")}
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {t("searchSubtitle")}
        </p>

        {/* Input Bar */}
        <form onSubmit={handleSearch} className="pt-4 max-w-lg mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("inputPlaceholder")}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="pl-9 font-mono uppercase text-sm"
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            {t("trackBtn")}
          </Button>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground text-sm">Locating shipment...</p>
        </div>
      )}

      {/* Error / Not Found */}
      {!isLoading && activeCode && (error || !tracking) && (
        <Card className="border-destructive/20 text-center p-8">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
          <CardTitle className="text-lg">{t("notFound")}</CardTitle>
          <CardDescription className="mt-1">{t("notFoundDesc")}</CardDescription>
        </Card>
      )}

      {/* Results View */}
      {!isLoading && tracking && (
        <div className="space-y-6">
          <Card className="shadow-md border-primary/20">
            <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-xs uppercase font-semibold text-muted-foreground">
                    Shipment Tracking ID
                  </span>
                  <p className="text-xl font-mono font-extrabold text-foreground">
                    {tracking.trackingCode}
                  </p>
                </div>
                <Badge variant="default" className="w-fit text-sm px-3 py-1 font-semibold">
                  {tracking.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border-b">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">
                  {t("destination")}
                </span>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  {tracking.recipientThana ? `${tracking.recipientThana}, ` : ""}
                  {tracking.recipientDistrict}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">
                  Customer Contact
                </span>
                <p className="font-mono text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {tracking.recipientPhoneMasked}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">
                  Current Location
                </span>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  {tracking.currentHubName || "Dhaka Central Sorting Hub"}
                </p>
              </div>
            </CardContent>

            {/* Timeline Stepper */}
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                {t("timeline")}
              </h3>

              <ol className="relative border-l border-primary/30 ml-4 space-y-6">
                {tracking.timeline.map((event, idx) => {
                  const label = locale === "bn" ? event.labelBn : event.labelEn;
                  const isLatest = idx === tracking.timeline.length - 1;

                  return (
                    <li key={idx} className="ml-6">
                      <span
                        className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-background text-xs ${
                          isLatest
                            ? "bg-primary text-primary-foreground font-bold shadow"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isLatest ? "●" : "✓"}
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-semibold text-sm text-foreground">
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {event.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
