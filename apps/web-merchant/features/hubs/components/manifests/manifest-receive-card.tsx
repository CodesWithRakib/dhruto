"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input } from "@dhruto/ui";
import { PackageCheck, X } from "lucide-react";

interface ManifestReceiveCardProps {
  bagCodeInput: string;
  setBagCodeInput: (val: string) => void;
  scannedBagCodes: string[];
  onAddBag: (e?: React.FormEvent) => void;
  onRemoveBag: (code: string) => void;
  allowPartial: boolean;
  setAllowPartial: (val: boolean) => void;
  onReceive: () => void;
  isReceiving: boolean;
}

export function ManifestReceiveCard({
  bagCodeInput,
  setBagCodeInput,
  scannedBagCodes,
  onAddBag,
  onRemoveBag,
  allowPartial,
  setAllowPartial,
  onReceive,
  isReceiving,
}: ManifestReceiveCardProps) {
  const t = useTranslations("Hub");

  return (
    <div className="relative rounded-3xl bg-card/90 backdrop-blur-md p-5 sm:p-6 space-y-4">
      {/* Specular top highlight */}

      <div>
        <h2 className="text-sm font-bold text-foreground">{t("manifests.receiveTitle")}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t("manifests.receiveHint")}</p>
      </div>

      <form onSubmit={onAddBag} className="flex gap-2.5">
        <Input
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          value={bagCodeInput}
          onChange={(event) => setBagCodeInput(event.target.value)}
          placeholder={t("manifests.bagCodePlaceholder")}
          aria-label={t("manifests.scannedBags")}
          className="h-12 rounded-2xl bg-surface-muted/60 font-mono uppercase focus:bg-background"
        />
        <Button
          type="submit"
          disabled={!bagCodeInput.trim()}
          className="h-12 rounded-2xl px-6 font-semibold"
        >
          {t("manifests.addScannedBag")}
        </Button>
      </form>

      {scannedBagCodes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {scannedBagCodes.map((code) => (
            <li key={code}>
              <Badge variant="default" className="gap-1 font-mono text-[11px] rounded-lg">
                {code}
                <button
                  type="button"
                  onClick={() => onRemoveBag(code)}
                  aria-label={`${t("close")} ${code}`}
                  className="ml-1 rounded-full hover:opacity-70"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={allowPartial}
            onChange={(event) => setAllowPartial(event.target.checked)}
            className="mt-0.5 rounded text-primary"
          />
          {t("manifests.allowPartial")}
        </label>
        <Button
          onClick={onReceive}
          disabled={isReceiving}
          className="w-full gap-1.5 rounded-2xl sm:w-auto font-semibold"
        >
          <PackageCheck className="h-4 w-4" aria-hidden="true" />
          {isReceiving ? t("manifests.receiving") : t("manifests.completeReceive")}
        </Button>
      </div>
    </div>
  );
}
