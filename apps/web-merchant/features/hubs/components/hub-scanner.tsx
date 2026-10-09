"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import {
  Scan,
  PackageCheck,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Camera,
  RotateCcw,
} from "lucide-react";
import { BagStatus, HubScanType, ScanOutcome, type HubScanResult } from "@dhruto/contracts";
import { useScanBarcodeMutation, useGetBagsQuery, useGetScansQuery } from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";

interface HubScannerProps {
  hubId: string;
  hubName: string;
}

interface ScanAttempt {
  key: string;
  result: HubScanResult | null;
  error: string | null;
  barcode: string;
  at: string;
}

type CameraState = "idle" | "unsupported" | "denied" | "active" | "unavailable";

/**
 * Continuous hub scanner.
 *
 * USB/Bluetooth keyboard-wedge scanners are primary: the input keeps focus so
 * the operator never clicks between scans. Every submission carries a fresh
 * idempotency key, so scanner key-repeat or a network retry cannot
 * double-apply an operation. Feedback never relies on color alone — outcome
 * text, icons and an optional audio beep are always present.
 */
export function HubScanner({ hubId, hubName }: HubScannerProps) {
  const t = useTranslations("Hub");
  const { time: fmtTime } = useFormatters();
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

  // Always stop the camera when leaving the scanner.
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
        // Audio is best-effort (e.g. blocked before first interaction).
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
          // Detection is best-effort; keep the preview running.
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
    <div className="space-y-6">
      {/* Scanner mode toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-2.5 sm:p-3 shadow-2xs"
        role="toolbar"
        aria-label={t("scanner.title")}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {modes.map((mode) => {
            const isActive = scanType === mode.type;
            return (
              <Button
                key={mode.type}
                type="button"
                size="sm"
                variant={isActive ? "default" : "ghost"}
                onClick={() => setScanType(mode.type)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <mode.icon className="h-4 w-4" aria-hidden="true" />
                {mode.label}
              </Button>
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
            className="flex items-center gap-2 rounded-xl text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="font-medium">{t("scanner.audioOn")}</span>
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
            variant="outline"
            size="sm"
            onClick={() => (cameraState === "active" ? stopCamera() : void startCamera())}
            className="flex items-center gap-2 rounded-xl text-xs border-border/80 hover:bg-muted/60"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {t("scanner.cameraScan")}
          </Button>
        </div>
      </div>

      {cameraState === "unsupported" || cameraState === "unavailable" ? (
        <p
          role="status"
          className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-xs text-muted-foreground"
        >
          {t("scanner.cameraUnsupported")}
        </p>
      ) : null}
      {cameraState === "denied" ? (
        <p
          role="alert"
          className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-xs text-danger-soft-foreground"
        >
          {t("scanner.cameraDenied")}
        </p>
      ) : null}
      {cameraState === "active" ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={t("scanner.cameraScan")}
              className="aspect-video w-full rounded-lg bg-background object-cover"
            />
            <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
              {t("close")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Bag target when packing */}
      {scanType === HubScanType.BAG_PARCEL ? (
        <Card className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("scanner.targetBag")}:</p>
              <p className="text-xs text-muted-foreground">{t("scanner.targetBagHint")}</p>
            </div>
            {openBags.length === 0 ? (
              <Badge variant="destructive" className="w-fit text-xs">
                {t("scanner.noOpenBags")}
              </Badge>
            ) : (
              <Select
                value={selectedBagId}
                onValueChange={setSelectedBagId}
              >
                <SelectTrigger aria-label={t("scanner.targetBag")} className="w-[300px] font-mono text-xs rounded-xl bg-card">
                  <SelectValue placeholder={t("scanner.targetBag")} />
                </SelectTrigger>
                <SelectContent>
                  {openBags.map((bag) => (
                    <SelectItem key={bag.id} value={bag.id} className="font-mono text-xs">
                      {bag.bagCode} → {bag.destinationHubName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </Card>
      ) : null}

      {/* Barcode input */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <Scan className="h-5 w-5 text-primary" aria-hidden="true" />
                {t("scanner.title")} — {hubName}
              </CardTitle>
              <CardDescription className="text-xs">{t("scanner.subtitle", { hub: hubName })}</CardDescription>
            </div>
            <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {modes.find((m) => m.type === scanType)?.label ?? scanType}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5 sm:p-6">
          <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Scan
                className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={inputRef}
                id="hub-scanner-input"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder={t("scanner.barcodePlaceholder")}
                aria-label={t("scanner.barcodeLabel")}
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                disabled={isLoading}
                className="h-12 rounded-xl pl-11 font-mono text-base uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !barcode.trim()}
              className="h-12 rounded-xl px-7 font-semibold shadow-xs"
            >
              {isLoading ? t("scanner.processing") : t("scanner.processScan")}
            </Button>
          </form>

          {/* Last result: icon + text, never color alone */}
          {lastAttempt?.result ? (
            <div
              role="status"
              className={
                lastAttempt.result.outcome === ScanOutcome.APPLIED
                  ? "flex items-start gap-3 rounded-xl border border-success bg-success-soft p-4 text-success"
                  : "flex items-start gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-warning"
              }
            >
              {lastAttempt.result.outcome === ScanOutcome.APPLIED ? (
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <AlertTriangle
                  className="mt-0.5 h-6 w-6 shrink-0 text-warning"
                  aria-hidden="true"
                />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold">{lastAttempt.result.barcode}</p>
                  <Badge
                    variant={
                      lastAttempt.result.outcome === ScanOutcome.APPLIED ? "success" : "secondary"
                    }
                    className="text-xs"
                  >
                    {lastAttempt.result.outcome === ScanOutcome.APPLIED
                      ? lastAttempt.result.currentStatus
                      : t("scanner.duplicateTitle")}
                  </Badge>
                </div>
                <p className="text-xs">{lastAttempt.result.message}</p>
                {lastAttempt.result.reasonCode ? (
                  <p className="font-mono text-[11px]">({lastAttempt.result.reasonCode})</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {lastAttempt?.error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-danger bg-danger-soft p-4 text-danger"
            >
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold">{lastAttempt.barcode}</p>
                  <Badge variant="destructive" className="text-xs">
                    {t("scanner.errorTitle")}
                  </Badge>
                </div>
                <p className="text-xs">{lastAttempt.error}</p>
                <Link href={HUB_ROUTES.parcels} className="text-xs font-semibold underline">
                  {t("scanner.lookupFallback")}
                </Link>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Session history */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4">
          <CardTitle className="text-sm font-bold text-foreground">
            {t("scanner.history")}
          </CardTitle>
          <CardDescription className="text-xs">{t("scanner.historyHint")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">
              {t("scanner.emptyHistory")}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {attempts.map((attempt) => (
                <li
                  key={attempt.key}
                  className="flex flex-wrap items-center gap-2.5 px-5 py-3 text-xs transition-colors hover:bg-muted/30"
                >
                  <span className="font-mono font-bold text-foreground">{attempt.barcode}</span>
                  {attempt.result ? (
                    <Badge
                      variant={
                        attempt.result.outcome === ScanOutcome.APPLIED
                          ? "success"
                          : attempt.result.outcome === ScanOutcome.DUPLICATE
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {attempt.result.scanType} · {attempt.result.outcome}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      {t("scanner.errorTitle")}
                    </Badge>
                  )}
                  <span className="block w-full truncate text-muted-foreground">
                    {attempt.result?.message ?? attempt.error}
                  </span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    {fmtTime(attempt.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Hub scan log */}
      {hubLog.length > 0 ? (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/20 px-5 py-4">
            <CardTitle className="text-sm font-bold text-foreground">
              {hubName} — Scan Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {hubLog.slice(0, 10).map((scan) => (
                <li key={scan.id} className="flex flex-wrap items-center gap-2.5 px-5 py-3 text-xs transition-colors hover:bg-muted/30">
                  <span className="font-mono font-bold text-foreground">
                    {scan.trackingCode ?? scan.bagCode ?? "—"}
                  </span>
                  <span className="rounded-md bg-muted/70 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                    {scan.scanType}
                  </span>
                  <Badge
                    variant={
                      scan.outcome === ScanOutcome.APPLIED
                        ? "success"
                        : scan.outcome === ScanOutcome.DUPLICATE
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {scan.outcome}
                  </Badge>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    {fmtTime(scan.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
