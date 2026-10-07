"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { Button, Card, Badge } from "@dhruto/ui";
import {
  useGetParcelIntelligenceQuery,
  useOverrideRecommendationMutation,
  useAcceptRecommendationMutation,
  useDismissRecommendationMutation,
} from "../api/intelligence.api";
import { getApiErrorMessage } from "@/lib/api-error";

function LevelBadge({ level }: { level: string }) {
  if (level === "HIGH") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        {level}
      </Badge>
    );
  }
  if (level === "UNKNOWN") {
    return <Badge variant="outline">{level}</Badge>;
  }
  return (
    <Badge variant={level === "LOW" ? "default" : "secondary"} className="gap-1">
      {level === "LOW" && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
      {level}
    </Badge>
  );
}

/**
 * Parcel delivery-risk panel: address confidence, risk score with reasons,
 * RTO assessment (heuristic score, not probability) and advisory
 * recommendations with audited override. Operational language only — never
 * fraud accusations. Hidden from customer tracking surfaces.
 */
export function ParcelIntelligencePanel({ parcelId }: { parcelId: string }) {
  const t = useTranslations("ParcelIntelligence");
  const { data, isLoading, isError, refetch } = useGetParcelIntelligenceQuery(parcelId);
  const [overrideId, setOverrideId] = React.useState<string | null>(null);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const [override, { isLoading: isOverriding }] = useOverrideRecommendationMutation();
  const [accept] = useAcceptRecommendationMutation();
  const [dismiss] = useDismissRecommendationMutation();

  const intel = data?.data;

  const handleOverride = async (id: string, decision: "PROCEED" | "HOLD") => {
    if (overrideReason.trim().length < 3) {
      setFeedback(t("reasonRequired"));
      return;
    }
    setFeedback(null);
    try {
      await override({ id, payload: { decision, reason: overrideReason.trim() } }).unwrap();
      setOverrideId(null);
      setOverrideReason("");
      refetch();
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t("overrideFailed")));
    }
  };

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        {t("loading")}
      </Card>
    );
  }

  if (isError || !intel) {
    // Fail-safe: intelligence unavailable must never block the parcel view.
    return (
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{t("unavailable")}</p>
        <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => refetch()}>
          <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
          {t("retry")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {t("versions", { model: intel.rto.modelVersion })}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {t("address")}
          </div>
          <p className="mt-1 text-sm font-medium">
            {intel.address.structuredAddress.district ?? "—"}
            {intel.address.structuredAddress.thana ? ` · ${intel.address.structuredAddress.thana}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("confidence", { score: Math.round(intel.address.confidence * 100) })}
            {intel.address.hasConflict ? ` · ${t("conflict")}` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{t("deliveryRisk")}</p>
          <div className="mt-1 flex items-center gap-2">
            <LevelBadge level={intel.risk.level} />
            <span className="font-mono text-sm font-semibold">{intel.risk.riskScore}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("scoreScale", { version: intel.risk.scoringVersion })}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{t("rtoRisk")}</p>
          <div className="mt-1 flex items-center gap-2">
            <LevelBadge level={intel.rto.level} />
            <span className="font-mono text-sm font-semibold">{intel.rto.score}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("heuristicNote")}</p>
        </div>
      </div>

      {intel.risk.reasons.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium">{t("why")}</p>
          <ul className="space-y-1">
            {intel.risk.reasons.map((r) => (
              <li key={r.code} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {r.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {intel.recommendations.filter((r) => r.status === "ACTIVE").length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium">{t("recommended")}</p>
          <div className="space-y-2">
            {intel.recommendations
              .filter((r) => r.status === "ACTIVE")
              .map((rec) => (
                <div key={rec.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{t(`action_${rec.action}`)}</p>
                  {rec.reasons.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{rec.reasons[0]?.detail}</p>
                  )}
                  {overrideId === rec.id ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder={t("overrideReasonPlaceholder")}
                        aria-label={t("overrideReasonPlaceholder")}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          disabled={isOverriding}
                          onClick={() => handleOverride(rec.id, "PROCEED")}
                        >
                          {t("proceed")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          disabled={isOverriding}
                          onClick={() => handleOverride(rec.id, "HOLD")}
                        >
                          {t("hold")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            setOverrideId(null);
                            setOverrideReason("");
                          }}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => accept(rec.id).then(() => refetch())}
                      >
                        {t("accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => dismiss(rec.id).then(() => refetch())}
                      >
                        {t("dismiss")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => setOverrideId(rec.id)}
                      >
                        {t("override")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {feedback && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground">
          {feedback}
        </div>
      )}
    </Card>
  );
}
