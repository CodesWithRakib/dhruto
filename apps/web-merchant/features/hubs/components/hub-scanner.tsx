"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BagStatus, HubScanType, ScanOutcome } from "@dhruto/contracts";
import { useScanBarcodeMutation, useGetBagsQuery, useGetScansQuery } from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { ScannerModeToolbar } from "./scanner/scanner-mode-toolbar";
import { ScannerCameraFeed, CameraState } from "./scanner/scanner-camera-feed";
import { ScannerBagTargetCard } from "./scanner/scanner-bag-target-card";
import { ScannerInputCard, ScanAttempt } from "./scanner/scanner-input-card";
import { ScannerHistoryCards } from "./scanner/scanner-history-cards";

interface HubScannerProps {
  hubId: string;
  hubName: string;
}

/**
 * Continuous hub scanner.
 *
 * USB/Bluetooth wedge scanners are primary: input keeps focus between scans.
 * Every submission carries an idempotency key to prevent double-application.
 * Decomposed into modular toolbar, camera feed, bag selector, and history cards.
 */
export function HubScanner({ hubId, hubName }: HubScannerProps) {
  const t = useTranslations("Hub");
  const [barcode, setBarcode] = React.useState("");
  const [scanType, setScanType] = React.useState<HubScanType>(HubScanType.RECEIVE_INBOUND);
  const [selectedBagId, setSelectedBagId] = React.useState<string>("");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [attempts, setAttempts] = React.useState<ScanAttempt[]>([]);
  const [cameraState, setCameraState] = React.useState<CameraState>("idle");

  const inputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [scanBarcodeMutation, { isLoading }] = useScanBarcodeMutation();

  const { data: bagsData } = useGetBagsQuery({ hubId, status: BagStatus.OPEN });
  const openBags = React.useMemo(() => bagsData?.data ?? [], [bagsData]);
  const { data: hubLogData, refetch: refetchLog } = useGetScansQuery({
    hubId,
    params: { limit: 20 },
  });
  const hubLog = hubLogData?.data ?? [];

  React.useEffect(() => {
    if (!selectedBagId && openBags.length > 0) {
      setSelectedBagId(openBags[0]?.id ?? "");
    }
  }, [openBags, selectedBagId]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, [scanType, hubId]);

  // Clean up camera stream on unmount
  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const playBeep = React.useCallback(
    (type: "success" | "error") => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = window.AudioContext || audioWindow.webkitAudioContext;
        if (!AudioCtor) return;
        const audioCtx = new AudioCtor();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === "success") {
          osc.frequency.setValueAtTime(800, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.15);
        } else {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(250, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.25);
        }
      } catch {
        // Audio is best-effort
      }
    },
    [soundEnabled],
  );

  const submitBarcode = React.useCallback(
    async (rawCode: string) => {
      const cleanCode = rawCode.trim();
      if (!cleanCode || isLoading) return;

      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      try {
        const res = await scanBarcodeMutation({
          hubId,
          scan: {
            barcode: cleanCode,
            scanType,
            bagId: scanType === HubScanType.BAG_PARCEL ? selectedBagId || undefined : undefined,
            idempotencyKey,
          },
        }).unwrap();

        const scanData = res.data;
        if (scanData) {
          const applied = scanData.outcome === ScanOutcome.APPLIED;
          playBeep(applied ? "success" : "error");
          setAttempts((prev) =>
            [
              {
                key: idempotencyKey,
                result: scanData,
                error: null,
                barcode: cleanCode,
                at: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 10),
          );
          if (applied) toast.success(scanData.message);
          else toast.warning(scanData.message);
          refetchLog();
        }
      } catch (err) {
        playBeep("error");
        const message = getApiErrorMessage(err, t("scanner.errorTitle"));
        setAttempts((prev) =>
          [
            {
              key: idempotencyKey,
              result: null,
              error: message,
              barcode: cleanCode,
              at: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 10),
        );
        toast.error(message);
      } finally {
        setBarcode("");
        inputRef.current?.focus();
      }
    },
    [hubId, isLoading, playBeep, refetchLog, scanBarcodeMutation, scanType, selectedBagId, t],
  );

  const handleScanSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitBarcode(barcode);
  };

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraState("idle");
  }, []);

  const startCamera = React.useCallback(async () => {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setCameraState("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraState("active");
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      const Detector = (
        window as unknown as {
          BarcodeDetector: new (opts?: object) => {
            detect(v: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
          };
        }
      ).BarcodeDetector;
      const detector = new Detector({ formats: ["code_128", "qr_code", "ean_13", "code_39"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            stopCamera();
            await submitBarcode(value);
            return;
          }
        } catch {
          // Detection best effort
        }
        window.setTimeout(tick, 400);
      };
      window.setTimeout(tick, 500);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setCameraState("denied");
      } else {
        setCameraState("unavailable");
      }
    }
  }, [stopCamera, submitBarcode]);

  const lastAttempt = attempts[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Scanner mode toolbar */}
      <ScannerModeToolbar
        scanType={scanType}
        setScanType={setScanType}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        cameraActive={cameraState === "active"}
        onToggleCamera={() => (cameraState === "active" ? stopCamera() : void startCamera())}
      />

      {/* Camera feed */}
      <ScannerCameraFeed
        cameraState={cameraState}
        videoRef={videoRef}
        onClose={stopCamera}
      />

      {/* Bag target when packing */}
      {scanType === HubScanType.BAG_PARCEL ? (
        <ScannerBagTargetCard
          openBags={openBags}
          selectedBagId={selectedBagId}
          onSelectBagId={setSelectedBagId}
        />
      ) : null}

      {/* Barcode input & latest outcome */}
      <ScannerInputCard
        ref={inputRef}
        hubName={hubName}
        scanType={scanType}
        barcode={barcode}
        setBarcode={setBarcode}
        onSubmit={handleScanSubmit}
        isLoading={isLoading}
        lastAttempt={lastAttempt}
      />

      {/* Session history & Hub scan log */}
      <ScannerHistoryCards
        hubName={hubName}
        attempts={attempts}
        hubLog={hubLog}
      />
    </div>
  );
}
