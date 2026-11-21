"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowRight, Barcode, CheckCircle2, ChevronRight, CornerDownLeft, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button, Input, Badge } from "@dhruto/ui";
import { HubScanType } from "@dhruto/contracts";
import { useScanBarcodeMutation } from "../../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Link } from "@/lib/navigation";
import { HUB_ROUTES } from "@/config/routes";

interface HubTerminalQuickScannerProps {
  hubId: string;
  hubName: string;
  onScanSuccess?: () => void;
}

export function HubTerminalQuickScanner({
  hubId,
  hubName,
  onScanSuccess,
}: HubTerminalQuickScannerProps) {
  const [barcode, setBarcode] = React.useState("");
  const [scanType, setScanType] = React.useState<HubScanType>(HubScanType.RECEIVE_INBOUND);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [lastResult, setLastResult] = React.useState<{
    trackingCode: string;
    success: boolean;
    message: string;
    timestamp: Date;
    currentStatus?: string;
    destinationHub?: string;
  } | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [scanBarcodeMutation, { isLoading }] = useScanBarcodeMutation();

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
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.15);
        } else {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(250, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.25);
        }
      } catch {
        // Best-effort audio feedback
      }
    },
    [soundEnabled],
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = barcode.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      const res = await scanBarcodeMutation({
        hubId,
        scan: {
          barcode: cleanCode,
          scanType,
          idempotencyKey: `${Date.now()}-${cleanCode}`,
        },
      }).unwrap();

      if (res.success && res.data) {
        playBeep("success");
        setLastResult({
          trackingCode: cleanCode,
          success: true,
          message: res.message || `Scanned ${cleanCode} successfully`,
          timestamp: new Date(),
          currentStatus: res.data.currentStatus,
          destinationHub: res.data.routingInfo?.destinationHubName,
        });
        toast.success(`${cleanCode}: ${res.message || "Scan registered"}`);
        setBarcode("");
        onScanSuccess?.();
      } else {
        throw new Error(res.message || "Scan failed");
      }
    } catch (err) {
      playBeep("error");
      const errMsg = getApiErrorMessage(err, "Barcode scan failed");
      setLastResult({
        trackingCode: cleanCode,
        success: false,
        message: errMsg,
        timestamp: new Date(),
      });
      toast.error(errMsg);
    } finally {
      inputRef.current?.focus();
    }
  };

  return (
    <section
      aria-label="Hub Inbound & Sort Terminal"
      className="relative overflow-hidden rounded-2xl bg-card p-5 transition-all duration-200"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Barcode className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-foreground">
                In-Terminal Scan Station
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Live Wedge Ready
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Scan barcode gun or enter tracking code at {hubName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
            title={soundEnabled ? "Mute audio beeps" : "Enable audio beeps"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="text-[11px]">{soundEnabled ? "Audio On" : "Muted"}</span>
          </Button>

          <Link href={HUB_ROUTES.scanner}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-xl text-xs font-semibold"
            >
              <span>Full Screen Scanner</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Mode Selector Strip */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
          Scan Mode:
        </span>
        <button
          type="button"
          onClick={() => {
            setScanType(HubScanType.RECEIVE_INBOUND);
            inputRef.current?.focus();
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            scanType === HubScanType.RECEIVE_INBOUND
              ? "bg-primary text-primary-foreground"
              : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground"
          }`}
        >
          <span>Receive Inbound</span>
          <span className="text-[10px] opacity-75 font-mono">[F1]</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setScanType(HubScanType.SORT);
            inputRef.current?.focus();
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            scanType === HubScanType.SORT
              ? "bg-primary text-primary-foreground"
              : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground"
          }`}
        >
          <span>Sort & Verify</span>
          <span className="text-[10px] opacity-75 font-mono">[F2]</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setScanType(HubScanType.RECEIVE_TRANSFER);
            inputRef.current?.focus();
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            scanType === HubScanType.RECEIVE_TRANSFER
              ? "bg-primary text-primary-foreground"
              : "bg-surface-muted text-muted-foreground hover:bg-surface-muted/80 hover:text-foreground"
          }`}
        >
          <span>Receive Transfer</span>
          <span className="text-[10px] opacity-75 font-mono">[F3]</span>
        </button>
      </div>

      {/* Scan Input Form */}
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col sm:flex-row items-stretch gap-2">
        <div className="relative flex-1">
          <Barcode
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan barcode or enter tracking number (e.g. DH-20261118-001) and hit Enter..."
            disabled={isLoading}
            className="h-11 rounded-xl bg-surface-muted/60 pl-10 pr-20 font-mono text-xs sm:text-sm tracking-wide uppercase placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
            autoComplete="off"
            spellCheck="false"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground pointer-events-none bg-surface-elevated px-1.5 py-0.5 rounded border border-border/40">
            <span>ENTER</span>
            <CornerDownLeft className="h-2.5 w-2.5" />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !barcode.trim()}
          className="h-11 px-5 rounded-xl text-xs font-bold gap-1.5 shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Registering...</span>
            </>
          ) : (
            <>
              <span>Scan Parcel</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </form>

      {/* Immediate Result Feedback Banner */}
      {lastResult ? (
        <div
          className={`mt-3 flex items-start justify-between gap-3 rounded-xl p-3 text-xs transition-all ${
            lastResult.success
              ? "bg-success/10 text-success border border-success/20"
              : "bg-danger/10 text-danger border border-danger/20"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {lastResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold mt-0.5">
                !
              </span>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold">{lastResult.trackingCode}</span>
                <span className="text-[10px] opacity-80">
                  {lastResult.timestamp.toLocaleTimeString()}
                </span>
                {lastResult.currentStatus ? (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                    Status: {lastResult.currentStatus}
                  </Badge>
                ) : null}
                {lastResult.destinationHub ? (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                    Destination: {lastResult.destinationHub}
                  </Badge>
                ) : null}
              </div>
              <p className="text-[11px] opacity-90">{lastResult.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastResult(null)}
            className="text-[11px] opacity-60 hover:opacity-100 font-bold"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </section>
  );
}
