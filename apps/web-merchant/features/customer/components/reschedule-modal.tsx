"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock, MessageSquare, ShieldCheck, Check } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import type { RescheduleDetails } from "../hooks/use-customer-deliveries";

export interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackingCode: string;
  currentAddress?: string;
  /** Persists the preference; resolve `true` to close the dialog. Errors are surfaced by the caller. */
  onSubmit: (details: RescheduleDetails) => Promise<boolean>;
}

const DAY_OFFSETS = { today: 0, tomorrow: 1, dayAfter: 2 } as const;

/** YYYY-MM-DD on the Asia/Dhaka calendar (UTC+6, no DST), `days` from now. */
function dhakaDate(days: number): string {
  return new Date(Date.now() + 6 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
}

const PRESET_INSTRUCTIONS = [
  "Leave with building reception / guard",
  "Call 15 minutes before arrival",
  "Ring doorbell, please do not call",
  "Deliver to my neighbor if unavailable",
];

const TIME_SLOTS = [
  { id: "morning", label: "Morning (09:00 AM - 01:00 PM)" },
  { id: "afternoon", label: "Afternoon (01:00 PM - 05:00 PM)" },
  { id: "evening", label: "Evening (05:00 PM - 08:30 PM)" },
];

export function RescheduleModal({
  open,
  onOpenChange,
  trackingCode,
  currentAddress,
  onSubmit,
}: RescheduleModalProps) {
  const t = useTranslations("Customer");

  const [dateChoice, setDateChoice] = React.useState<"today" | "tomorrow" | "dayAfter">("today");
  const [selectedSlot, setSelectedSlot] = React.useState<string>("afternoon");
  const [selectedInstruction, setSelectedInstruction] = React.useState<string>(
    PRESET_INSTRUCTIONS[0] ?? "",
  );
  const [customNote, setCustomNote] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const slotObj = TIME_SLOTS.find((s) => s.id === selectedSlot);
    const combinedInstruction = customNote.trim()
      ? `${selectedInstruction} (${customNote.trim()})`
      : selectedInstruction;

    try {
      const saved = await onSubmit({
        date: dhakaDate(DAY_OFFSETS[dateChoice]),
        slotLabel: slotObj?.label ?? selectedSlot,
        instruction: combinedInstruction.slice(0, 300),
      });
      // Keep the dialog open on failure so the customer can retry.
      if (saved) onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-6 sm:p-7 shadow-2xl rounded-3xl border border-border/80">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader className="gap-2.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft border border-primary/20 text-primary shadow-2xs">
                <Calendar className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  {t("rescheduleTitle")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t("rescheduleSubtitle", { code: trackingCode })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {currentAddress ? (
            <div className="rounded-xl border border-border/60 bg-surface-muted/60 p-3 text-xs text-muted-foreground flex items-center justify-between">
              <span className="truncate pr-2">
                Delivering to: <strong className="text-foreground">{currentAddress}</strong>
              </span>
              <span className="shrink-0 font-mono text-[11px] text-primary font-semibold">
                Active
              </span>
            </div>
          ) : null}

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("selectDate")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "today", label: "Today" },
                { id: "tomorrow", label: "Tomorrow" },
                { id: "dayAfter", label: "In 2 Days" },
              ].map((item) => {
                const isSelected = dateChoice === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDateChoice(item.id as typeof dateChoice)}
                    className={`flex h-11 items-center justify-center rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-primary bg-primary-soft text-primary shadow-xs ring-1 ring-primary/40"
                        : "border-border/80 bg-surface hover:bg-surface-muted text-foreground"
                    }`}
                  >
                    {isSelected ? <Check className="mr-1.5 h-3.5 w-3.5 text-primary" /> : null}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Time Slot */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("preferredSlot")}
            </label>
            <div className="space-y-1.5">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                      isSelected
                        ? "border-primary bg-primary-soft/60 text-primary font-bold shadow-2xs"
                        : "border-border/70 bg-surface hover:bg-surface-muted text-foreground font-medium"
                    }`}
                  >
                    <span>{slot.label}</span>
                    {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Instructions for Rider */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              {t("riderInstructions")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_INSTRUCTIONS.map((preset) => {
                const isSelected = selectedInstruction === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedInstruction(preset)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border/70 bg-surface hover:bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Or write custom instructions for the rider (gate code, landmark, etc.)..."
              className="w-full rounded-xl border border-border/80 bg-surface p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-primary-soft/50 p-2.5 text-[11px] text-primary-soft-foreground border border-primary/20">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Instructions will be instantly dispatched to your assigned rider&apos;s terminal.
            </span>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-10 px-5 text-xs font-semibold"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-10 px-5 text-xs font-semibold shadow-xs"
              loading={isSubmitting}
            >
              Confirm Instructions
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
