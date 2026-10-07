"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, MapPin, AlertTriangle } from "lucide-react";
import { Button, Card, Badge } from "@dhruto/ui";
import { useParseAddressV2Mutation, useConfirmAddressMutation } from "../api/intelligence.api";
import type { AddressParseV2Result } from "@dhruto/contracts";
import { getApiErrorMessage } from "@/lib/api-error";

interface AddressConfirmationProps {
  initialAddress?: string;
  onConfirmed?: (district: string, thana: string | null) => void;
}

/**
 * Address confirmation workflow: parse → confidence indicator → candidate
 * selection when ambiguous → audited confirmation. Never edits the caller's
 * original text; confirmation returns the chosen structured geography.
 */
export function AddressConfirmation({ initialAddress, onConfirmed }: AddressConfirmationProps) {
  const t = useTranslations("AddressConfirmation");
  const [input, setInput] = React.useState(initialAddress ?? "");
  const [result, setResult] = React.useState<AddressParseV2Result | null>(null);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);

  const [parse, { isLoading: isParsing }] = useParseAddressV2Mutation();
  const [confirm, { isLoading: isConfirming }] = useConfirmAddressMutation();

  const handleParse = async (text?: string) => {
    const raw = (text ?? input).trim();
    if (raw.length < 3) return;
    setError(null);
    setConfirmed(false);
    setSelected(null);
    try {
      const res = await parse({
        rawAddress: raw,
        includeCandidates: true,
        maxCandidates: 5,
      }).unwrap();
      if (res.data) setResult(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("parseFailed")));
    }
  };

  const handleConfirm = async () => {
    if (!result || !result.parseId || selected === null) return;
    setError(null);
    try {
      await confirm({
        parseId: result.parseId,
        candidateIndex: selected,
      }).unwrap();
      const candidate = result.candidates[selected];
      if (candidate) onConfirmed?.(candidate.district, candidate.thana);
      setConfirmed(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t("confirmFailed")));
    }
  };

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        {result && (
          <Badge
            variant={result.requiresConfirmation ? "secondary" : "default"}
            className="ml-auto"
          >
            {t("confidence", { score: confidencePct })}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleParse();
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <Button
          size="sm"
          className="h-10"
          disabled={isParsing || input.trim().length < 3}
          onClick={() => handleParse()}
        >
          {isParsing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {t("parse")}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {result.hasConflict && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-warning bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{result.conflictDetail ?? t("conflictHint")}</span>
            </div>
          )}

          {result.requiresConfirmation ? (
            <div>
              <p className="mb-2 text-xs font-medium">{t("chooseLocation")}</p>
              <div role="radiogroup" aria-label={t("chooseLocation")} className="space-y-2">
                {result.candidates.map((c, i) => (
                  <button
                    key={`${c.district}-${c.thana}-${i}`}
                    type="button"
                    role="radio"
                    aria-checked={selected === i}
                    onClick={() => setSelected(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(i);
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      selected === i
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span>
                      <span className="font-medium">{c.district}</span>
                      {c.thana && <span className="text-muted-foreground"> · {c.thana}</span>}
                      {c.division && (
                        <span className="block text-[11px] text-muted-foreground">
                          {c.division}
                        </span>
                      )}
                    </span>
                    <Badge variant="outline" className="shrink-0 font-mono text-[11px]">
                      {Math.round(c.confidence * 100)}%
                    </Badge>
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="mt-3"
                disabled={selected === null || isConfirming || !result.parseId}
                onClick={handleConfirm}
              >
                {isConfirming ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t("confirm")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-success bg-success-soft px-3 py-2.5 text-sm text-success-soft-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {t("detected", {
                  district: result.structuredAddress.district ?? "—",
                  thana: result.structuredAddress.thana ?? "—",
                })}
              </span>
            </div>
          )}

          {confirmed && (
            <p role="status" className="text-xs text-success">
              {t("confirmed")}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground">
            {t("versions", {
              parser: result.parserVersion,
              dataset: result.datasetVersion,
            })}
          </p>
        </div>
      )}
    </Card>
  );
}
