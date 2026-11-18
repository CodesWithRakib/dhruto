"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";

export type CameraState = "idle" | "unsupported" | "denied" | "active" | "unavailable";

interface ScannerCameraFeedProps {
  cameraState: CameraState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
}

export function ScannerCameraFeed({ cameraState, videoRef, onClose }: ScannerCameraFeedProps) {
  const t = useTranslations("Hub");

  if (cameraState === "idle") return null;

  if (cameraState === "unsupported" || cameraState === "unavailable") {
    return (
      <p
        role="status"
        className="rounded-2xl bg-card/90 px-4 py-3 text-xs text-muted-foreground"
      >
        {t("scanner.cameraUnsupported")}
      </p>
    );
  }

  if (cameraState === "denied") {
    return (
      <p
        role="alert"
        className="rounded-2xl bg-danger-soft px-4 py-3 text-xs text-danger"
      >
        {t("scanner.cameraDenied")}
      </p>
    );
  }

  return (
    <div className="relative rounded-3xl bg-card/90 backdrop-blur-md p-4 space-y-2">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label={t("scanner.cameraScan")}
        className="aspect-video w-full rounded-2xl bg-black object-cover"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="rounded-xl bg-surface-muted hover:bg-surface-muted/80 text-xs font-semibold"
      >
        {t("close")}
      </Button>
    </div>
  );
}
