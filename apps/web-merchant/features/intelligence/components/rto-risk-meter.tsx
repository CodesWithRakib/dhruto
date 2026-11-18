"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
} from "@dhruto/ui";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  PhoneCall,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingDown,
  History,
  Info,
} from "lucide-react";
import { useEvaluateRecipientRiskMutation } from "../api/intelligence.api";
import { useGetParcelsQuery } from "@/features/parcels/api/parcels.api";
import { type RecipientRiskResult, type RiskTier } from "@dhruto/contracts";
import { toast } from "sonner";

interface RtoRiskMeterProps {
  initialPhone?: string;
  initialCod?: number;
  initialAddress?: string;
}

export function RtoRiskMeter({
  initialPhone = "",
  initialCod = 1000,
  initialAddress = "",
}: RtoRiskMeterProps) {
  const t = useTranslations("Intelligence");
  const [phone, setPhone] = useState(initialPhone);
  const [cod, setCod] = useState<number | string>(initialCod);
  const [address, setAddress] = useState(initialAddress);

  // Dynamic recent customer shipments (Zero static mocks)
  const { data: parcelsData } = useGetParcelsQuery({ limit: 4 });
  const recentOrders = (parcelsData?.data ?? [])
    .filter((p) => p.recipientPhone && p.recipientPhone.length >= 10)
    .slice(0, 3)
    .map((p) => ({
      name: `${p.recipientName || "Customer"} (${p.trackingCode})`,
      phone: p.recipientPhone,
      cod: Number(p.codAmount ?? 0),
      address: p.deliveryAddress || "",
    }));

  const [evaluateRisk, { data: responseData, isLoading }] = useEvaluateRecipientRiskMutation();
  const riskResult: RecipientRiskResult | undefined = responseData?.data;

  const handleEvaluate = async (
    customPhone?: string,
    customCod?: number,
    customAddress?: string,
  ) => {
    const targetPhone = (customPhone ?? phone).trim();
    const targetCod = Number(customCod ?? cod);
    const targetAddr = (customAddress ?? address).trim();

    if (!targetPhone || targetPhone.length < 10) {
      toast.error("Please enter a valid 11-digit phone number");
      return;
    }
    if (!targetAddr || targetAddr.length < 3) {
      toast.error("Please provide a delivery address");
      return;
    }

    try {
      const res = await evaluateRisk({
        recipientPhone: targetPhone,
        codAmount: isNaN(targetCod) ? 0 : targetCod,
        rawAddress: targetAddr,
      }).unwrap();

      if (res.data) {
        toast.success(`Evaluated: ${res.data.riskTier} Risk (${res.data.riskScore}/100)`);
      }
    } catch {
      toast.error("Failed to evaluate risk. Please check connection.");
    }
  };

  const getTierDetails = (tier: RiskTier, _score?: number) => {
    switch (tier) {
      case "LOW":
        return {
          label: "Low Risk (Safe)",
          color: "text-success-soft-foreground bg-success-soft",
          icon: <ShieldCheck className="h-5 w-5 text-success-soft-foreground" />,
          progressColor: "bg-success",
        };
      case "MEDIUM":
        return {
          label: "Moderate Risk (Verify)",
          color: "text-warning-soft-foreground bg-warning-soft",
          icon: <Shield className="h-5 w-5 text-warning-soft-foreground" />,
          progressColor: "bg-warning",
        };
      case "HIGH":
      default:
        return {
          label: "High Risk (Action Needed)",
          color: "text-danger-soft-foreground bg-danger-soft",
          icon: <ShieldAlert className="h-5 w-5 text-danger-soft-foreground" />,
          progressColor: "bg-danger",
        };
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "POSITIVE":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-success-soft text-success-soft-foreground">
            Positive
          </span>
        );
      case "WARNING":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-warning-soft text-warning-soft-foreground">
            Warning
          </span>
        );
      case "CRITICAL":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-danger-soft text-danger-soft-foreground">
            Critical
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-muted text-muted-foreground">
            Neutral
          </span>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="bg-primary/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("riskTitle")}</CardTitle>
              <CardDescription>
                {t("riskDesc")}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-background text-xs font-mono">
            Carrier Validation • COD Ratio • History
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Dynamic recent customer bookings (Zero static mocks) */}
        {recentOrders.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1.5 font-medium">
              {t("recentCustomerOrders")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recentOrders.map((scenario) => (
                <button
                  key={scenario.name}
                  type="button"
                  onClick={() => {
                    setPhone(scenario.phone);
                    setCod(scenario.cod);
                    setAddress(scenario.address);
                    handleEvaluate(scenario.phone, scenario.cod, scenario.address);
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted/40 hover:bg-muted text-foreground transition-colors flex items-center gap-1 font-mono"
                >
                  <span>{scenario.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              {t("recipientPhone")}
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01712345678"
              maxLength={11}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              {t("codAmount")}
            </label>
            <Input
              type="number"
              value={cod}
              onChange={(e) => setCod(e.target.value)}
              placeholder="e.g. 1500"
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            {t("deliveryAddress")}
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. House 14, Road 11, Dhanmondi, Dhaka"
            className="text-sm"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPhone("");
              setCod(0);
              setAddress("");
            }}
            disabled={isLoading || (!phone && !address)}
            className="flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("reset")}
          </Button>

          <Button
            type="button"
            onClick={() => handleEvaluate()}
            disabled={isLoading || !phone || !address}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? t("evaluating") : t("predictRto")}
          </Button>
        </div>

        {/* Risk Assessment Result */}
        {riskResult && (
          <div className="mt-6 rounded-lg bg-card overflow-hidden">
            {/* Header with Risk Tier & Score */}
            <div
              className={`p-4 flex items-center justify-between flex-wrap gap-2 ${getTierDetails(riskResult.riskTier, riskResult.riskScore).color}`}
            >
              <div className="flex items-center gap-2.5">
                {getTierDetails(riskResult.riskTier, riskResult.riskScore).icon}
                <div>
                  <h4 className="font-bold text-base">
                    {getTierDetails(riskResult.riskTier, riskResult.riskScore).label}
                  </h4>
                  <p className="text-xs opacity-90 font-mono">
                    Target: {riskResult.normalizedPhone}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black font-mono">
                  {riskResult.riskScore}
                  <span className="text-xs font-normal opacity-75">/100</span>
                </div>
                <div className="text-[11px] font-medium opacity-90 flex items-center gap-1 justify-end">
                  <TrendingDown className="h-3 w-3" />
                  RTO Probability: {riskResult.rtoProbability}%
                </div>
              </div>
            </div>

            {/* Risk Bar Meter */}
            <div className="p-4 space-y-2 bg-muted/20">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>0 (Safe)</span>
                <span>Risk Index Gauge</span>
                <span>100 (Critical)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getTierDetails(riskResult.riskTier, riskResult.riskScore).progressColor}`}
                  style={{ width: `${Math.min(100, Math.max(5, riskResult.riskScore))}%` }}
                />
              </div>
            </div>

            {/* Action Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-muted/10 text-xs">
              <div
                className={`p-2 rounded flex items-center gap-2 ${riskResult.safeToDispatch ? "bg-success-soft text-success  " : "bg-danger-soft text-danger  "}`}
              >
                {riskResult.safeToDispatch ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span className="font-semibold">
                  {riskResult.safeToDispatch ? "Safe to Dispatch" : "Hold for Review"}
                </span>
              </div>

              <div
                className={`p-2 rounded flex items-center gap-2 ${riskResult.requiresPhoneVerification ? "bg-warning-soft text-warning  " : "bg-muted text-muted-foreground"}`}
              >
                <PhoneCall className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  {riskResult.requiresPhoneVerification
                    ? "Call Verification Needed"
                    : "No Phone Check Needed"}
                </span>
              </div>

              <div
                className={`p-2 rounded flex items-center gap-2 ${riskResult.requiresAdvancePayment ? "bg-primary-soft text-primary  " : "bg-muted text-muted-foreground"}`}
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  {riskResult.requiresAdvancePayment
                    ? "Advance Fee Suggested"
                    : "Full COD Permitted"}
                </span>
              </div>
            </div>

            {/* Historical Delivery Profile */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                <History className="h-3.5 w-3.5" />
                <span>Customer Lifetime Shipping History</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground block text-[10px]">Total Orders</span>
                  <span className="text-base font-bold font-mono">
                    {riskResult.deliveryHistory.totalOrders}
                  </span>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground block text-[10px]">Delivered</span>
                  <span className="text-base font-bold font-mono text-success">
                    {riskResult.deliveryHistory.deliveredOrders}
                  </span>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground block text-[10px]">Returns / RTO</span>
                  <span className="text-base font-bold font-mono text-danger">
                    {riskResult.deliveryHistory.returnedOrders}
                  </span>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground block text-[10px]">Completion</span>
                  <span className="text-base font-bold font-mono text-info">
                    {riskResult.deliveryHistory.completionRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Factors List */}
            {riskResult.riskFactors && riskResult.riskFactors.length > 0 && (
              <div className="p-4 space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Identified Risk Signals & Signals
                </span>
                <div className="space-y-1.5">
                  {riskResult.riskFactors.map((factor, index) => (
                    <div
                      key={index}
                      className="p-2 rounded bg-card flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {factor.label}
                        </div>
                        <p className="text-muted-foreground">{factor.description}</p>
                      </div>
                      <div>{getImpactBadge(factor.impact)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operational Recommendations */}
            {riskResult.operationalRecommendations &&
              riskResult.operationalRecommendations.length > 0 && (
                <div className="p-4 bg-muted/30 space-y-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    Proactive Merchant Recommendations
                  </span>
                  <ul className="space-y-1 text-xs">
                    {riskResult.operationalRecommendations.map((rec, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
