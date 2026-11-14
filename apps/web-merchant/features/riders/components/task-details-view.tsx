"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import {
  Phone,
  Navigation,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Play,
  DollarSign,
  FileText,
  RefreshCw,
  History,
  Clock,
  Check,
} from "lucide-react";
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
import { useFormatters } from "@/lib/format";

interface TaskDetailsViewProps {
  parcelId: string;
}

const FAILURE_REASONS = Object.values(DeliveryFailureReason);

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ASSIGNED_TO_RIDER: {
    label: "Assigned",
    dot: "bg-blue-500 ring-blue-500/30",
    badge: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    dot: "bg-amber-500 ring-amber-500/30 animate-pulse",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  DELIVERED: {
    label: "Delivered",
    dot: "bg-emerald-500 ring-emerald-500/30",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  CASH_PENDING: {
    label: "Cash Pending Hand-In",
    dot: "bg-amber-500 ring-amber-500/30",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  CASH_VERIFIED: {
    label: "Cash Verified",
    dot: "bg-emerald-500 ring-emerald-500/30",
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  FAILED_ATTEMPT: {
    label: "Failed Attempt",
    dot: "bg-rose-500 ring-rose-500/30",
    badge: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  RETURNED_TO_HUB: {
    label: "Returned to Hub",
    dot: "bg-slate-500 ring-slate-500/30",
    badge: "border-border bg-surface-muted text-muted-foreground",
  },
};

/**
 * Customer handoff screen: start -> OTP verify (+resend) -> exact COD ->
 * complete, or a recorded failed attempt with an optional validated
 * reschedule. Completion always carries an idempotency key generated once per
 * screen mount, so retries never double-record cash.
 */
export function TaskDetailsView({ parcelId }: TaskDetailsViewProps) {
  const t = useTranslations("Rider");
  const { bdt, time: fmtTime, dateTime } = useFormatters();
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

  const mapsUrl = task
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${task.deliveryAddress}, ${task.thana || ""}, ${task.district || ""}, Bangladesh`,
      )}`
    : "#";

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

  const codMatches = task.codAmount === 0 || (collectedAmount !== undefined && collectedAmount === task.codAmount);

  return (
    <div className="space-y-5">
      {done ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-3xl bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-800 dark:text-emerald-200"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-extrabold text-foreground">{t("details.deliveredBanner")}</p>
            <p className="text-xs text-muted-foreground">This delivery task has been successfully completed and closed.</p>
          </div>
        </div>
      ) : null}

      {/* Customer + parcel summary */}
      <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-extrabold text-foreground">{task.trackingCode}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(task.trackingCode);
                toast.success(task.trackingCode);
              }}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
              aria-label="Copy tracking code"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              (STATUS_CONFIG[task.status] || { badge: "bg-primary-soft text-primary" }).badge
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ring-2 ${
                (STATUS_CONFIG[task.status] || { dot: "bg-primary ring-primary/30" }).dot
              }`}
            />
            <span>{(STATUS_CONFIG[task.status] || { label: task.status.replace(/_/g, " ") }).label}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-surface-muted/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("details.recipient")}
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">{task.recipientName}</p>
          </div>

          <div className="rounded-2xl bg-surface-muted/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("details.phone")}
            </p>
            <a
              href={`tel:${task.recipientPhone}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{task.recipientPhone}</span>
            </a>
          </div>

          <div className="rounded-2xl bg-amber-500/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
              {t("details.codDue")}
            </p>
            <p className="mt-1 font-mono text-base font-extrabold text-foreground">
              {task.codAmount > 0 ? (
                <span className="text-amber-900 dark:text-amber-100">{bdt(task.codAmount)}</span>
              ) : (
                <span className="text-muted-foreground">Prepaid</span>
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-surface-muted/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("details.weight")}
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-foreground">{task.weight} kg</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-muted/40 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("details.address")}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {task.deliveryAddress}
            {[task.thana, task.district].filter(Boolean).length > 0
              ? `, ${[task.thana, task.district].filter(Boolean).join(", ")}`
              : ""}
          </p>
        </div>

        {/* Quick Communication Actions */}
        <div className="flex flex-wrap gap-2.5 sm:flex-nowrap">
          <a
            href={`tel:${task.recipientPhone}`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 px-4 text-xs font-bold text-emerald-800 dark:text-emerald-200 transition-all hover:bg-emerald-500/25"
          >
            <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>{t("tasks.callCustomer")}</span>
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500/15 px-4 text-xs font-bold text-blue-800 dark:text-blue-200 transition-all hover:bg-blue-500/25"
          >
            <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>{t("tasks.openMap")}</span>
          </a>
        </div>

        {!started && !done ? (
          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="h-12 w-full gap-2 rounded-2xl text-sm font-bold"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {isStarting ? t("details.starting") : t("details.startDelivery")}
          </Button>
        ) : null}
      </div>

      {/* Handoff: OTP + COD + complete */}
      {started && !done ? (
        <div className="rounded-3xl bg-surface-elevated p-5 sm:p-6 space-y-6">
          {/* Step 1: OTP Verification */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">
                    {t("details.otpSectionTitle")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ask customer for their 6-digit verification code from their Dhruto tracking dashboard or SMS.
                  </p>
                </div>
              </div>

              {task.otpVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Verified
                </span>
              ) : null}
            </div>

            {task.otpVerified ? (
              <div
                role="status"
                className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/15 px-4 py-3 text-xs font-bold text-emerald-800 dark:text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t("details.otpVerified")} — Handover authorized.</span>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-3">
                <div className="flex gap-2.5">
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP code"
                    aria-label={t("details.otpLabel")}
                    className="h-12 flex-1 rounded-2xl border-0 bg-surface-muted/60 text-center font-mono text-xl tracking-[0.35em] font-black placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground focus:bg-background"
                  />
                  <Button
                    type="submit"
                    disabled={isVerifying || otp.trim().length !== 6}
                    className="h-12 rounded-2xl px-6 text-xs font-bold"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{t("details.verifying")}</span>
                      </>
                    ) : (
                      t("details.verifyOtp")
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {task.otpExpiresAt
                      ? t("details.otpExpiresIn", { time: fmtTime(task.otpExpiresAt) })
                      : "Code sent via SMS"}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
                    <span>{isResending ? t("details.resending") : t("details.resendOtp")}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Step 2: Cash Collection & Complete Delivery */}
          <form onSubmit={handleComplete} className="space-y-4 border-t border-border/20 pt-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  {t("details.codSectionTitle")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {task.codAmount > 0
                    ? "Collect cash payment before handing over goods"
                    : "No cash collection required for this prepaid package"}
                </p>
              </div>
            </div>

            {task.codAmount > 0 ? (
              <div className="space-y-2">
                <label
                  htmlFor="cod-collected"
                  className="text-xs font-bold text-foreground"
                >
                  {t("details.codCollectedLabel")} *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-extrabold text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    id="cod-collected"
                    type="number"
                    min={0}
                    value={collectedAmount ?? ""}
                    onChange={(event) =>
                      setCollectedAmount(
                        event.target.value === "" ? undefined : Number(event.target.value),
                      )
                    }
                    className="h-12 rounded-2xl border-0 bg-surface-muted/60 pl-8 font-mono text-lg font-black focus:bg-background"
                    required
                  />
                </div>

                {/* Quick tender amount buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Quick set:</span>
                  <button
                    type="button"
                    onClick={() => setCollectedAmount(task.codAmount)}
                    className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Exact {bdt(task.codAmount)}
                  </button>
                  {[500, 1000, 2000, 5000]
                    .filter((amt) => amt >= task.codAmount && amt !== task.codAmount)
                    .slice(0, 3)
                    .map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCollectedAmount(amt)}
                        className="rounded-full bg-surface-muted/60 px-3 py-1 font-mono text-xs text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
                      >
                        ৳{amt}
                      </button>
                    ))}
                </div>
                <p className={`flex items-center gap-1.5 text-xs ${codMatches ? "text-emerald-700 dark:text-emerald-300 font-semibold" : "text-amber-700 dark:text-amber-300 font-semibold"}`}>
                  {codMatches ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Exact amount matches COD due.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{t("details.codMustMatch")} ({bdt(task.codAmount)})</span>
                    </>
                  )}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label
                htmlFor="delivery-remarks"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("details.remarksLabel")}</span>
              </label>
              <Input
                id="delivery-remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder={t("details.remarksPlaceholder")}
                maxLength={500}
                className="h-11 rounded-2xl border-0 bg-surface-muted/60 text-sm focus:bg-background"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="submit"
                disabled={isCompleting}
                className="h-12 flex-1 gap-2 rounded-2xl text-sm font-bold"
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {isCompleting ? t("details.completing") : t("details.completeDelivery")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFailOpen(true)}
                className="h-12 flex-1 gap-2 rounded-2xl bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>{t("details.failTitle")}</span>
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Attempt trail */}
      <div className="overflow-hidden rounded-3xl bg-surface-elevated">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <History className="h-4 w-4" aria-hidden="true" />
            <span>{t("details.attemptsTitle")}</span>
          </h2>
          <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-mono font-bold text-muted-foreground">
            {task.attempts.length}
          </span>
        </div>

        {task.attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted/60 text-muted-foreground">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">First Delivery Attempt</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              No prior attempts have been recorded for this package. All delivery actions and outcomes will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/20">
            {task.attempts.map((attempt) => (
              <li key={attempt.id} className="space-y-1.5 p-4 text-xs transition-colors hover:bg-surface-muted/30">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      attempt.outcome === "DELIVERED"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    #{attempt.attemptNumber} {attempt.outcome === "DELIVERED" ? "Delivered" : "Attempt Failed"}
                  </span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    {dateTime(attempt.createdAt)}
                  </span>
                </div>
                {attempt.failureReason ? (
                  <p className="font-semibold text-foreground">
                    {t(
                      `failReasons.${attempt.failureReason}` as "failReasons.CUSTOMER_UNAVAILABLE",
                    )}
                  </p>
                ) : null}
                {attempt.notes ? <p className="text-muted-foreground">{attempt.notes}</p> : null}
                {attempt.rescheduledFor ? (
                  <p className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-700 dark:text-amber-300">
                    <span>Rescheduled:</span>
                    <span>{dateTime(attempt.rescheduledFor)}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Failed-attempt dialog */}
      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogContent className="max-w-md rounded-3xl border-0 bg-surface-elevated p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">{t("details.failTitle")}</DialogTitle>
                <DialogDescription className="font-mono text-xs font-semibold text-muted-foreground">{task.trackingCode}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleFail} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="fail-reason" className="text-xs font-semibold text-foreground">
                {t("details.failReason")} *
              </label>
              <Select
                value={failReason}
                onValueChange={(value) => setFailReason(value as DeliveryFailureReason)}
                required
              >
                <SelectTrigger id="fail-reason" className="w-full h-11 rounded-2xl border-0 bg-surface-muted/60 focus:bg-background">
                  <SelectValue placeholder={t("details.failReason")} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 bg-surface-elevated shadow-xl">
                  {FAILURE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason} className="rounded-xl">
                      {t(`failReasons.${reason}` as "failReasons.CUSTOMER_UNAVAILABLE")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fail-notes" className="text-xs font-semibold text-foreground">
                {t("details.failNotes")}
              </label>
              <Input
                id="fail-notes"
                value={failNotes}
                onChange={(event) => setFailNotes(event.target.value)}
                placeholder={t("details.failNotesPlaceholder")}
                maxLength={500}
                className="h-11 rounded-2xl border-0 bg-surface-muted/60 text-sm focus:bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="reschedule-date"
                className="text-xs font-semibold text-foreground"
              >
                {t("details.rescheduleLabel")}
              </label>
              <Input
                id="reschedule-date"
                type="datetime-local"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                className="h-11 rounded-2xl border-0 bg-surface-muted/60 text-sm focus:bg-background"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setFailOpen(false)} className="h-11 rounded-xl">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isFailing} className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isFailing ? t("details.submitting") : t("details.submitFailure")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
