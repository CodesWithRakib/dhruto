"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PackageCheck, Truck, Undo2 } from "lucide-react";
import { Button } from "@dhruto/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  useAdvanceRtoMutation,
  useCompleteRtoMutation,
  useInitiateRtoMutation,
} from "@/features/parcels/api/parcels.api";
import { getApiErrorMessage } from "@/lib/api-error";

type Step = "initiate" | "advance" | "complete";

/** Which return step a parcel in this status can take next (mirrors the API state machine). */
export function returnStepFor(status: string): Step | null {
  if (status === "DELIVERY_ATTEMPTED" || status === "RESCHEDULED") return "initiate";
  if (status === "RTO_INITIATED") return "advance";
  if (status === "RETURN_IN_TRANSIT") return "complete";
  return null;
}

interface HubReturnActionsProps {
  parcelId: string;
  trackingCode: string;
  status: string;
  onDone?: () => void;
}

/**
 * Return-to-merchant workflow for hub staff: start the return for a failed
 * delivery, dispatch it on the return leg, then confirm the merchant received
 * it. Each step is confirmed; the API enforces roles and transitions.
 */
export function HubReturnActions({ parcelId, trackingCode, status, onDone }: HubReturnActionsProps) {
  const t = useTranslations("Hub.returns");
  const [open, setOpen] = React.useState(false);
  const [initiate, initiateState] = useInitiateRtoMutation();
  const [advance, advanceState] = useAdvanceRtoMutation();
  const [complete, completeState] = useCompleteRtoMutation();
  const step = returnStepFor(status);
  if (!step) return null;

  const config = {
    initiate: { icon: Undo2, run: initiate, loading: initiateState.isLoading, tone: "danger" as const },
    advance: { icon: Truck, run: advance, loading: advanceState.isLoading, tone: "default" as const },
    complete: { icon: PackageCheck, run: complete, loading: completeState.isLoading, tone: "default" as const },
  }[step];
  const Icon = config.icon;

  const onConfirm = async () => {
    try {
      const res = await config.run(parcelId).unwrap();
      toast.success(res.message || t(`${step}.done`, { code: trackingCode }));
      setOpen(false);
      onDone?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t(`${step}.failed`)));
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-10 w-full gap-2 rounded-xl bg-surface-elevated sm:w-auto font-medium hover:bg-surface-muted"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {t(`${step}.action`)}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t(`${step}.title`, { code: trackingCode })}
        description={t(`${step}.description`)}
        confirmLabel={t(`${step}.confirm`)}
        tone={config.tone}
        loading={config.loading}
        onConfirm={onConfirm}
      />
    </>
  );
}
