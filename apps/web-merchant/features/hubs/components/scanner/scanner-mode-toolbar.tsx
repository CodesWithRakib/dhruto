"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import {
  ArrowRightLeft,
  Camera,
  PackageCheck,
  RotateCcw,
  Scan,
  Volume2,
  VolumeX,
} from "lucide-react";
import { HubScanType } from "@dhruto/contracts";

interface ScannerModeToolbarProps {
  scanType: HubScanType;
  setScanType: (type: HubScanType) => void;
  soundEnabled: boolean;
  setSoundEnabled: (fn: (val: boolean) => boolean) => void;
  cameraActive: boolean;
  onToggleCamera: () => void;
}

export function ScannerModeToolbar({
  scanType,
  setScanType,
  soundEnabled,
  setSoundEnabled,
  cameraActive,
  onToggleCamera,
}: ScannerModeToolbarProps) {
  const t = useTranslations("Hub");

  const modes = [
    {
      type: HubScanType.RECEIVE_INBOUND,
      label: t("scanner.modeReceiveInbound"),
      icon: PackageCheck,
    },
    { type: HubScanType.BAG_PARCEL, label: t("scanner.modeBagParcel"), icon: Scan },
    {
      type: HubScanType.RECEIVE_TRANSFER,
      label: t("scanner.modeReceiveTransfer"),
      icon: ArrowRightLeft,
    },
    { type: HubScanType.SORT, label: t("scanner.modeSort"), icon: RotateCcw },
  ];

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-card/90 backdrop-blur-md p-2 sm:p-2.5 shadow-xs"
      role="toolbar"
      aria-label={t("scanner.title")}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {modes.map((mode) => {
          const isActive = scanType === mode.type;
          return (
            <button
              key={mode.type}
              type="button"
              onClick={() => setScanType(mode.type)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
              }`}
            >
              <mode.icon className="h-4 w-4" aria-hidden="true" />
              {mode.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled((value) => !value)}
          aria-pressed={soundEnabled}
          className="flex items-center gap-2 rounded-xl text-xs text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="font-semibold">{t("scanner.audioOn")}</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>{t("scanner.audioOff")}</span>
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCamera}
          className={`flex items-center gap-2 rounded-xl text-xs ${
            cameraActive ? "bg-primary text-primary-foreground" : "bg-surface-muted/60 hover:bg-surface-muted"
          }`}
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          {t("scanner.cameraScan")}
        </Button>
      </div>
    </div>
  );
}
