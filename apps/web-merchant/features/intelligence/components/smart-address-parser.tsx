"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from "@dhruto/ui";
import {
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Search,
  RotateCcw,
} from "lucide-react";
import { useParseAddressMutation } from "../api/intelligence.api";
import { type AddressParseResult } from "@dhruto/contracts";
import { toast } from "sonner";

interface SmartAddressParserProps {
  onApply?: (result: AddressParseResult) => void;
  initialAddress?: string;
  showApplyButton?: boolean;
}

const SAMPLE_ADDRESSES = [
  {
    label: "Dhaka Banani",
    text: "House 14, Road 11, Block C, Banani, Dhaka 1213",
  },
  {
    label: "Bengali Mirpur",
    text: "মিরপুর ১০, সেনপাড়া পর্বতা, ঢাকা ১২১৬",
  },
  {
    label: "Chittagong Port",
    text: "Agrabad Commercial Area, Double Mooring, Chattogram 4100",
  },
  {
    label: "Typo / Misspelled",
    text: "house 5, dhanmandi rd 27, dhka",
  },
];

export function SmartAddressParser({
  onApply,
  initialAddress = "",
  showApplyButton = false,
}: SmartAddressParserProps) {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [copied, setCopied] = useState(false);
  const [parseAddress, { data: responseData, isLoading }] = useParseAddressMutation();

  const result: AddressParseResult | undefined = responseData?.data;

  const handleParse = async (textToParse?: string) => {
    const raw = (textToParse ?? addressInput).trim();
    if (!raw || raw.length < 3) {
      toast.error("Please enter a valid address with at least 3 characters.");
      return;
    }

    try {
      const res = await parseAddress({ rawAddress: raw }).unwrap();
      if (res.data) {
        toast.success(`Address parsed with ${res.data.confidenceScore}% confidence!`);
      }
    } catch {
      toast.error("Failed to parse address. Please verify connection to API.");
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const summary = `${result.thana}, ${result.district}${result.postalCode ? ` - ${result.postalCode}` : ""}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("Parsed address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getConfidenceBadge = (tier: string, score: number) => {
    if (tier === "HIGH") {
      return (
        <Badge variant="success" className="flex items-center gap-1 font-semibold">
          <CheckCircle2 className="h-3 w-3" />
          {score}% High Confidence
        </Badge>
      );
    }
    if (tier === "MEDIUM") {
      return (
        <Badge variant="warning" className="flex items-center gap-1 font-semibold">
          <AlertTriangle className="h-3 w-3" />
          {score}% Medium Confidence
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1 font-semibold">
        <AlertTriangle className="h-3 w-3" />
        {score}% Review Recommended
      </Badge>
    );
  };

  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case "INSIDE_DHAKA":
        return {
          label: "Inside Dhaka (Same Day / Next Day)",
          color: "text-success bg-success-soft border-success",
        };
      case "DHAKA_SUBURBS":
        return {
          label: "Dhaka Suburb (Gazipur / Narayanganj)",
          color: "text-warning bg-warning-soft border-warning",
        };
      case "OUTSIDE_DHAKA":
      default:
        return {
          label: "Outside Dhaka (National Inter-District)",
          color: "text-info bg-info-soft border-info",
        };
    }
  };

  return (
    <Card className=" border-primary/20">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart BD Address Parser</CardTitle>
              <CardDescription>
                Bilingual (English & Bengali) NLP address extractor with fuzzy typo correction
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-background text-xs font-mono">
            64 Districts • 240+ Upazilas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Free-Form Address Text
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="e.g. House 42, Road 7, Block D, Banani, Dhaka-1213 or মিরপুর ১০, সেনপাড়া পর্বতা, ঢাকা ১২১৬"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-sans"
            />
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div>
          <span className="text-xs text-muted-foreground block mb-1.5 font-medium">
            Try instant examples:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_ADDRESSES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setAddressInput(sample.text);
                  handleParse(sample.text);
                }}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors flex items-center gap-1"
              >
                <span>{sample.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAddressInput("");
            }}
            disabled={!addressInput || isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => handleParse()}
            disabled={isLoading || !addressInput.trim()}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {isLoading ? "Analyzing..." : "Parse & Extract"}
          </Button>
        </div>

        {/* Parsed Result View */}
        {result && (
          <div className="mt-6 border rounded-lg bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Extraction Result</span>
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  Lang: {result.language}
                </span>
              </div>
              {getConfidenceBadge(result.confidenceTier, result.confidenceScore)}
            </div>

            <div className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-md border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground block uppercase">
                    District
                  </span>
                  <p className="font-bold text-foreground text-base mt-0.5">{result.district}</p>
                </div>

                <div className="p-2.5 rounded-md border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground block uppercase">
                    Thana / Upazila
                  </span>
                  <p className="font-bold text-foreground text-base mt-0.5">{result.thana}</p>
                </div>

                <div className="p-2.5 rounded-md border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground block uppercase">
                    Area / Sector
                  </span>
                  <p className="font-semibold text-foreground mt-0.5">{result.area || "—"}</p>
                </div>

                <div className="p-2.5 rounded-md border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground block uppercase">
                    Postal Code
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {result.postalCode || "—"}
                  </p>
                </div>
              </div>

              {/* Delivery Zone */}
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase block">
                    Calculated Delivery Zone
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border inline-block mt-1 font-medium ${getZoneLabel(result.zone).color}`}
                  >
                    {getZoneLabel(result.zone).label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Matched Keywords</span>
                  <div className="flex flex-wrap gap-1 justify-end mt-1">
                    {result.matchedKeywords.map((kw, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 bg-muted rounded font-mono">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Suggested Corrections */}
              {result.suggestedCorrections && result.suggestedCorrections.length > 0 && (
                <div className="p-3 rounded-md bg-warning-soft border border-warning text-warning  text-xs space-y-1">
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

            <div className="p-3 bg-muted/40 border-t flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs"
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
                  className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground"
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
