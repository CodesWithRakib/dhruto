"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
} from "@dhruto/ui";
import {
  Scan,
  PackageCheck,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { HubScanType, type HubScanResult } from "@dhruto/contracts";
import { useScanBarcodeMutation } from "../api/hubs.api";
import { toast } from "sonner";

interface HubScannerProps {
  hubId: string;
  hubName: string;
  openBags: Array<{ id: string; bagCode: string; destinationHub: string }>;
  onScanSuccess?: () => void;
}

export function HubScanner({ hubId, hubName, openBags, onScanSuccess }: HubScannerProps) {
  const [barcode, setBarcode] = useState("");
  const [scanType, setScanType] = useState<HubScanType>(HubScanType.RECEIVE_INBOUND);
  const [selectedBagId, setSelectedBagId] = useState<string>(openBags[0]?.id || "");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastResult, setLastResult] = useState<HubScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<HubScanResult[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [scanBarcodeMutation, { isLoading }] = useScanBarcodeMutation();

  useEffect(() => {
    inputRef.current?.focus();
  }, [scanType]);

  useEffect(() => {
    if (openBags.length > 0 && !selectedBagId) {
      setSelectedBagId(openBags[0]?.id || "");
    }
  }, [openBags, selectedBagId]);

  // Audio feedback using Web Audio API synthetic beeps
  const playBeep = (type: "success" | "error") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      // Audio context might be restricted before interaction
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = barcode.trim();
    if (!cleanCode) return;

    try {
      const res = await scanBarcodeMutation({
        hubId,
        scan: {
          barcode: cleanCode,
          scanType,
          bagId: scanType === HubScanType.BAG_PARCEL ? selectedBagId : undefined,
        },
      }).unwrap();

      const scanData = res.data;
      if (res.success && scanData) {
        playBeep("success");
        setLastResult(scanData);
        setScanHistory((prev) => [scanData, ...prev.slice(0, 9)]);
        setBarcode("");
        toast.success(scanData.message);
        onScanSuccess?.();
      }
    } catch (err: any) {
      playBeep("error");
      const msg = err?.data?.message || err?.message || "Scan failed. Please verify barcode.";
      toast.error(msg);
    } finally {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={scanType === HubScanType.RECEIVE_INBOUND ? "default" : "outline"}
            onClick={() => setScanType(HubScanType.RECEIVE_INBOUND)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <PackageCheck className="h-4 w-4" />
            Receive Inbound
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scanType === HubScanType.BAG_PARCEL ? "default" : "outline"}
            onClick={() => setScanType(HubScanType.BAG_PARCEL)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Scan className="h-4 w-4" />
            Pack into Bag
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scanType === HubScanType.RECEIVE_TRANSFER ? "default" : "outline"}
            onClick={() => setScanType(HubScanType.RECEIVE_TRANSFER)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Receive Transfer
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scanType === HubScanType.SORT ? "default" : "outline"}
            onClick={() => setScanType(HubScanType.SORT)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Truck className="h-4 w-4" />
            Sort & Verify
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-4 w-4 text-emerald-600" />
              <span>Audio Beep On</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              <span>Muted</span>
            </>
          )}
        </Button>
      </div>

      {/* Bag Selection dropdown when BAG_PARCEL mode */}
      {scanType === HubScanType.BAG_PARCEL && (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Select Target Transit Bag:</p>
              <p className="text-xs text-muted-foreground">
                All scanned parcels will be packed into this destination consolidation bag.
              </p>
            </div>
            {openBags.length === 0 ? (
              <Badge variant="destructive" className="w-fit text-xs">
                No open bags at this hub. Create a bag in Bag Management tab first.
              </Badge>
            ) : (
              <select
                value={selectedBagId}
                onChange={(e) => setSelectedBagId(e.target.value)}
                className="text-xs font-mono font-medium rounded-lg border border-primary/40 bg-background px-3 py-2 outline-none"
              >
                {openBags.map((bag) => (
                  <option key={bag.id} value={bag.id}>
                    {bag.bagCode} → {bag.destinationHub}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Card>
      )}

      {/* Barcode Scanner Input Card */}
      <Card className="shadow-md border-primary/20">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" />
                Barcode Scanner Terminal — {hubName}
              </CardTitle>
              <CardDescription>
                Scan or enter tracking ID / bag barcode. Supports handheld laser scanners.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              MODE: {scanType}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Scan barcode or type tracking code (e.g. DHR-20261004-XXXXXX or BAG-...)..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={isLoading}
                className="pl-10 font-mono text-base uppercase tracking-wider h-12 shadow-inner"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !barcode.trim()}
              className="h-12 px-6 font-semibold flex items-center gap-2"
            >
              {isLoading ? "Processing..." : "Process Scan"}
            </Button>
          </form>

          {/* Last Result Alert Banner */}
          {lastResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-start gap-3 transition-all animate-in fade-in">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm font-mono">{lastResult.barcode}</p>
                  <Badge variant="success" className="text-xs">
                    {lastResult.currentStatus}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  {lastResult.message}
                </p>
                {lastResult.routingInfo?.destinationHubName && (
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Destination: {lastResult.routingInfo.destinationHubName}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Recent Scans Log */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Recent Scans Stream
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scanHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No scans logged during this session.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-2 font-semibold">Barcode</th>
                  <th className="px-4 py-2 font-semibold">Scan Action</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Message</th>
                  <th className="px-4 py-2 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scanHistory.map((scan, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono font-medium text-foreground">
                      {scan.barcode}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-primary">
                      {scan.scanType}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-muted font-bold">
                        {scan.currentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {scan.message}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
