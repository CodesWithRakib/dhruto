"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, MessageSquareText, Package, Store } from "lucide-react";
import type { RiderTaskDetails } from "@dhruto/contracts";
import { useFormatters } from "@/lib/format";

interface TaskInstructionsCardProps {
  task: Pick<RiderTaskDetails, "parcelDescription" | "deliveryInstructions">;
}

/**
 * What the rider must know before knocking: item description, the
 * recipient's own doorstep instruction / preferred slot (customer portal)
 * and the merchant's delivery note. Hidden when there is nothing to show.
 */
export function TaskInstructionsCard({ task }: TaskInstructionsCardProps) {
  const t = useTranslations("Rider");
  const { date } = useFormatters();
  const { merchantNote, customerNote, preferredDate, preferredSlot } = task.deliveryInstructions;

  const rows: Array<{ icon: React.ElementType; label: string; value: string; emphasis?: boolean }> = [];
  if (preferredDate || preferredSlot) {
    rows.push({
      icon: CalendarClock,
      label: t("details.preferredTime"),
      value: [preferredDate ? date(preferredDate) : null, preferredSlot].filter(Boolean).join(" · "),
      emphasis: true,
    });
  }
  if (customerNote) {
    rows.push({ icon: MessageSquareText, label: t("details.customerNote"), value: customerNote, emphasis: true });
  }
  if (merchantNote) {
    rows.push({ icon: Store, label: t("details.merchantNote"), value: merchantNote });
  }
  if (task.parcelDescription) {
    rows.push({ icon: Package, label: t("details.itemDescription"), value: task.parcelDescription });
  }
  if (rows.length === 0) return null;

  return (
    <section className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-3" aria-labelledby="task-instructions-title">
      <h2
        id="task-instructions-title"
        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        {t("details.instructionsTitle")}
      </h2>
      <ul className="space-y-2">
        {rows.map(({ icon: Icon, label, value, emphasis }) => (
          <li
            key={label}
            className={
              emphasis
                ? "flex items-start gap-3 rounded-2xl bg-warning-soft p-3 text-warning-soft-foreground"
                : "flex items-start gap-3 rounded-2xl bg-surface-muted p-3 text-foreground"
            }
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
              <p className="text-sm font-medium break-words">{value}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
