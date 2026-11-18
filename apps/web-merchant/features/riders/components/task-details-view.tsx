"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { DeliveryFailureReason } from "@dhruto/contracts";
import {
  useGetRiderTaskDetailsQuery,
  useStartDeliveryMutation,
  useVerifyOtpMutation,
  useRequestOtpMutation,
  useCompleteDeliveryMutation,
  useFailDeliveryMutation,
} from "../api/riders.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { TaskCustomerCard } from "./tasks/task-customer-card";
import { TaskOtpSection } from "./tasks/task-otp-section";
import { TaskCodSection } from "./tasks/task-cod-section";
import { TaskAttemptsCard } from "./tasks/task-attempts-card";
import { TaskFailDialog } from "./tasks/task-fail-dialog";

interface TaskDetailsViewProps {
  parcelId: string;
}

/**
 * Customer handoff screen: start -> OTP verify (+resend) -> exact COD ->
 * complete, or a recorded failed attempt with an optional validated
 * reschedule. Completion always carries an idempotency key generated once per
 * screen mount, so retries never double-record cash.
 */
export function TaskDetailsView({ parcelId }: TaskDetailsViewProps) {
  const t = useTranslations("Rider");
  const [otp, setOtp] = React.useState("");
  const [collectedAmount, setCollectedAmount] = React.useState<number | undefined>(undefined);
  const [remarks, setRemarks] = React.useState("");
  const [failOpen, setFailOpen] = React.useState(false);
  const [failReason, setFailReason] = React.useState<DeliveryFailureReason>(
    DeliveryFailureReason.CUSTOMER_UNAVAILABLE,
  );
  const [failNotes, setFailNotes] = React.useState("");
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const idempotencyKey = React.useMemo(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const { data, isLoading, isError, refetch } = useGetRiderTaskDetailsQuery(parcelId);
  const [startDelivery, { isLoading: isStarting }] = useStartDeliveryMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [requestOtp, { isLoading: isResending }] = useRequestOtpMutation();
  const [completeDelivery, { isLoading: isCompleting }] = useCompleteDeliveryMutation();
  const [failDelivery, { isLoading: isFailing }] = useFailDeliveryMutation();

  const task = data?.data;
  const started = task?.status === "OUT_FOR_DELIVERY";
  const done =
    task?.status === "DELIVERED" ||
    task?.status === "CASH_PENDING" ||
    task?.status === "CASH_VERIFIED";

  React.useEffect(() => {
    if (task && collectedAmount === undefined && task.codAmount > 0) {
      setCollectedAmount(task.codAmount);
    }
  }, [task, collectedAmount]);

  const handleStart = async () => {
    try {
      const res = await startDelivery(parcelId).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("details.startDelivery")));
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error(t("details.otpPlaceholder"));
      return;
    }
    try {
      const res = await verifyOtp({ parcelId, dto: { otp: otp.trim() } }).unwrap();
      if (res.success) {
        toast.success(res.data?.message ?? t("details.otpVerified"));
        setOtp("");
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("verifyOtp")));
    }
  };

  const handleResend = async () => {
    try {
      const res = await requestOtp(parcelId).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("details.resendOtp")));
    }
  };

  const handleComplete = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await completeDelivery({
        parcelId,
        dto: {
          otp: task?.otpVerified ? undefined : otp.trim() || undefined,
          codAmountCollected: collectedAmount,
          remarks: remarks.trim() || undefined,
        },
        idempotencyKey,
      }).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("complete")));
    }
  };

  const handleFail = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await failDelivery({
        parcelId,
        dto: {
          reason: failReason,
          notes: failNotes.trim() || undefined,
          rescheduledDate: rescheduleDate || undefined,
        },
      }).unwrap();
      if (res.success) {
        toast.success(res.message);
        setFailOpen(false);
        setFailNotes("");
        setRescheduleDate("");
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("details.failTitle")));
    }
  };

  if (isLoading) {
    return (
      <p role="status" className="py-16 text-center text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }

  if (isError || !task) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="error"
        title={t("loadFailed")}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {done ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-3xl bg-success/10 px-5 py-4 text-sm font-bold text-success-soft-foreground"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-success text-white">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-extrabold text-foreground">{t("details.deliveredBanner")}</p>
            <p className="text-xs text-muted-foreground">
              This delivery task has been successfully completed and closed.
            </p>
          </div>
        </div>
      ) : null}

      {/* Customer + parcel summary */}
      <TaskCustomerCard
        task={task}
        started={started}
        done={done}
        isStarting={isStarting}
        onStart={handleStart}
      />

      {/* Handoff: OTP + COD + complete */}
      {started && !done ? (
        <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-6">
          <TaskOtpSection
            otp={otp}
            setOtp={setOtp}
            otpVerified={task.otpVerified}
            otpExpiresAt={task.otpExpiresAt}
            isVerifying={isVerifying}
            isResending={isResending}
            onVerify={handleVerify}
            onResend={handleResend}
          />

          <TaskCodSection
            codAmount={task.codAmount}
            collectedAmount={collectedAmount}
            setCollectedAmount={setCollectedAmount}
            remarks={remarks}
            setRemarks={setRemarks}
            isCompleting={isCompleting}
            onComplete={handleComplete}
            onOpenFail={() => setFailOpen(true)}
          />
        </div>
      ) : null}

      {/* Attempt trail */}
      <TaskAttemptsCard attempts={task.attempts} />

      {/* Failed-attempt dialog */}
      <TaskFailDialog
        open={failOpen}
        onOpenChange={setFailOpen}
        trackingCode={task.trackingCode}
        failReason={failReason}
        setFailReason={setFailReason}
        failNotes={failNotes}
        setFailNotes={setFailNotes}
        rescheduleDate={rescheduleDate}
        setRescheduleDate={setRescheduleDate}
        isFailing={isFailing}
        onFail={handleFail}
      />
    </div>
  );
}
