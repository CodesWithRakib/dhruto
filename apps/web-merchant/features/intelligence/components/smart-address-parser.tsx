"use client";

import React, { useState } from "react";
import {
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge } from "@dhruto/ui";
import { useParseAddressMutation } from "../api/intelligence.api";
import { useGetParcelsQuery } from "@/features/parcels/api/parcels.api";
import {
  DeliveryZone,
  type AddressParseResult,
} from "@dhruto/contracts";
import { toast } from "sonner";

interface SmartAddressParserProps {
  onApply?: (result: AddressParseResult) => void;
  initialAddress?: string;
  showApplyButton?: boolean;
}

export function SmartAddressParser({
  onApply,
  initialAddress = "",
  showApplyButton = false,
}: SmartAddressParserProps) {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [copied, setCopied] = useState(false);
  const [parseAddress, { data: responseData, isLoading }] = useParseAddressMutation();

  // Dynamic recent addresses from merchant's real parcels
  const { data: parcelsData } = useGetParcelsQuery({ limit: 6 });
  const recentAddresses = (parcelsData?.data ?? [])
    .filter((p) => p.deliveryAddress && p.deliveryAddress.trim().length > 3)
    .slice(0, 4)
    .map((p) => ({
      label: `${p.thana || p.district}`,
      text: `${p.deliveryAddress}, ${p.thana}, ${p.district}`,
    }));

  const result: AddressParseResult | undefined = responseData?.data;

  const handleParse = async (textToParse?: string) => {
    const raw = (textToParse ?? addressInput).trim();
    if (!raw || raw.length < 3) {
      toast.error("Please enter a valid address with at least 3 characters.");
      return;
    }

    try {
      await parseAddress({ rawAddress: raw }).unwrap();
      toast.success("Address successfully analyzed & parsed!");
    } catch {
      toast.error("Failed to parse address. Please verify your connection.");
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const summary = `${result.rawAddress}, ${result.thana}, ${result.district}${result.postalCode ? ` - ${result.postalCode}` : ""}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Standardized address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getConfidenceBadge = (tier: "HIGH" | "MEDIUM" | "LOW", score: number) => {
    switch (tier) {
      case "HIGH":
        return (
          <Badge variant="outline" className="text-success bg-success/10 flex items-center gap-1 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            High Confidence ({score}%)
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge variant="outline" className="text-warning bg-warning/10 flex items-center gap-1 font-mono">
            <ShieldCheck className="h-3.5 w-3.5" />
            Medium Confidence ({score}%)
          </Badge>
        );
      case "LOW":
      default:
        return (
          <Badge variant="outline" className="text-danger bg-danger/10 flex items-center gap-1 font-mono">
            <AlertCircle className="h-3.5 w-3.5" />
            Low Confidence ({score}%)
          </Badge>
        );
    }
  };

  const getZoneLabel = (zone: DeliveryZone) => {
    switch (zone) {
      case DeliveryZone.INSIDE_DHAKA:
        return {
          label: "Inside Dhaka (Same-Day / Next-Day)",
          color: "text-success bg-success/10",
        };
      case DeliveryZone.DHAKA_SUBURBS:
        return {
          label: "Greater Dhaka Suburbs",
          color: "text-warning bg-warning/10",
        };
      case DeliveryZone.OUTSIDE_DHAKA:
      default:
        return {
          label: "Outside Dhaka (National Inter-District)",
          color: "text-info bg-info/10",
        };
    }
  };

  return (
    <Card className="rounded-3xl bg-surface-elevated/90 backdrop-blur-md overflow-hidden">
      <CardHeader className="bg-primary/5 p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-h4 font-bold text-foreground">Smart BD Address Parser</CardTitle>
              <CardDescription className="text-body-sm text-muted-foreground">
                Bilingual (English & Bengali) NLP address extractor with fuzzy typo correction
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-background/80 text-xs font-mono">
            64 Districts • 590+ Thanas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6 sm:p-7">
        <div>
          <label className="text-caption font-bold text-muted-foreground uppercase tracking-wider block mb-2">
            Free-Form Address Text
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="e.g. House 42, Road 7, Block D, Banani, Dhaka-1213 or মিরপুর ১০, সেনপাড়া পর্বতা, ঢাকা ১২১৬"
              className="w-full rounded-2xl bg-field p-3.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-surface-elevated transition-colors resize-none font-sans hover:bg-field-hover"
            />
          </div>
        </div>

        {/* Dynamic Recent Customer Addresses (Zero static mocks) */}
        {recentAddresses.length > 0 && (
          <div>
            <span className="text-caption text-muted-foreground block mb-2 font-semibold">
              Recent Customer Addresses:
            </span>
            <div className="flex flex-wrap gap-2">
              {recentAddresses.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAddressInput(sample.text);
                    void handleParse(sample.text);
                  }}
                  className="text-caption font-medium px-3 py-1 rounded-xl bg-surface-muted/60 hover:bg-surface-muted text-foreground transition-all flex items-center gap-1.5"
                >
                  <MapPin className="h-3 w-3 text-primary" />
                  <span>{sample.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddressInput("")}
            disabled={!addressInput || isLoading}
            className="flex items-center gap-1.5 text-xs rounded-xl"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => void handleParse()}
            disabled={isLoading || !addressInput.trim()}
            className="flex items-center gap-2 rounded-xl bg-primary"
          >
            <Search className="h-4 w-4" />
            {isLoading ? "Analyzing..." : "Parse & Extract"}
          </Button>
        </div>

        {/* Parsed Result View */}
        {result && (
          <div className="mt-6 rounded-2xl bg-surface-muted/30 overflow-hidden">
            <div className="p-4 bg-surface-elevated flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-bold text-body-sm text-foreground">Extraction Result</span>
                <span className="text-caption px-2 py-0.5 rounded-md bg-surface-muted text-muted-foreground font-mono font-medium">
                  Lang: {result.language}
                </span>
              </div>
              {getConfidenceBadge(result.confidenceTier, result.confidenceScore)}
            </div>

            <div className="p-5 space-y-4 text-body-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-elevated/70">
                  <span className="text-caption font-semibold text-muted-foreground block uppercase">
                    District
                  </span>
                  <p className="font-bold text-foreground text-body-md mt-0.5">{result.district}</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-elevated/70">
                  <span className="text-caption font-semibold text-muted-foreground block uppercase">
                    Thana / Upazila
                  </span>
                  <p className="font-bold text-foreground text-body-md mt-0.5">{result.thana}</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-elevated/70">
                  <span className="text-caption font-semibold text-muted-foreground block uppercase">
                    Area / Sector
                  </span>
                  <p className="font-semibold text-foreground mt-0.5">{result.area || "—"}</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-elevated/70">
                  <span className="text-caption font-semibold text-muted-foreground block uppercase">
                    Postal Code
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {result.postalCode || "—"}
                  </p>
                </div>
              </div>

              {/* Delivery Zone */}
              <div className="rounded-xl bg-surface-elevated/70 p-3.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-caption font-semibold text-muted-foreground uppercase block">
                    Calculated Delivery Zone
                  </span>
                  <span
                    className={`text-caption px-2.5 py-0.5 rounded-full inline-block mt-1 font-semibold ${getZoneLabel(result.zone).color}`}
                  >
                    {getZoneLabel(result.zone).label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-caption text-muted-foreground block">Matched Keywords</span>
                  <div className="flex flex-wrap gap-1 justify-end mt-1">
                    {result.matchedKeywords.map((kw, i) => (
                      <span key={i} className="text-caption px-1.5 py-0.5 bg-surface-muted rounded font-mono font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Suggested Corrections */}
              {result.suggestedCorrections && result.suggestedCorrections.length > 0 && (
                <div className="p-3.5 rounded-xl bg-warning/10 text-warning-soft-foreground text-caption space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Typo Auto-Corrections & Recommendations:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {result.suggestedCorrections.map((corr, idx) => (
                      <li key={idx}>{corr}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-muted/50 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs rounded-xl"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy Parsed"}
              </Button>

              {showApplyButton && onApply && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApply(result)}
                  className="flex items-center gap-1.5 text-xs rounded-xl bg-primary text-primary-foreground"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Auto-Fill Booking Fields
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
