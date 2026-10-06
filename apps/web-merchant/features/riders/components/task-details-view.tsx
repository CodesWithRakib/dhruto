"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

interface TaskDetailsViewProps {
  parcelId: string;
}

const FAILURE_REASONS = Object.values(DeliveryFailureReason);

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

  return (
    <div className="space-y-4">
      {done ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-success bg-success-soft px-4 py-3 text-xs font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("details.deliveredBanner")}
        </p>
      ) : null}

      {/* Customer + parcel summary */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm font-bold text-foreground">{task.trackingCode}</p>
            <Badge className="text-[11px]">{task.status}</Badge>
          </div>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("details.recipient")}</dt>
              <dd className="font-semibold text-foreground">{task.recipientName}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("details.phone")}</dt>
              <dd>
                <a href={`tel:${task.recipientPhone}`} className="font-semibold text-primary hover:underline">
                  {task.recipientPhone}
                </a>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("details.address")}</dt>
              <dd className="text-foreground">
                {task.deliveryAddress}
                {[task.thana, task.district].filter(Boolean).length > 0
                  ? `, ${[task.thana, task.district].filter(Boolean).join(", ")}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("details.codDue")}</dt>
              <dd className="font-mono font-bold tabular-nums text-foreground">
                ৳{task.codAmount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("details.weight")}</dt>
              <dd className="font-mono tabular-nums text-foreground">{task.weight} kg</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <a
              href={`tel:${task.recipientPhone}`}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold"
            >
              <Phone className="h-4 w-4 text-success" aria-hidden="true" />
              {t("tasks.callCustomer")}
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold"
            >
              <Navigation className="h-4 w-4 text-info" aria-hidden="true" />
              {t("tasks.openMap")}
            </a>
          </div>
          {!started && !done ? (
            <Button onClick={handleStart} disabled={isStarting} className="h-12 w-full gap-1.5 text-base">
              <Play className="h-5 w-5" aria-hidden="true" />
              {isStarting ? t("details.starting") : t("details.startDelivery")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Handoff: OTP + COD + complete */}
      {started && !done ? (
        <Card className="border-primary/20">
          <CardContent className="space-y-5 p-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                {t("details.otpSectionTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("details.otpHint")}</p>
            </div>

            {task.otpVerified ? (
              <p role="status" className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-xs font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("details.otpVerified")}
              </p>
            ) : (
              <form onSubmit={handleVerify} className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  placeholder={t("details.otpPlaceholder")}
                  aria-label={t("details.otpLabel")}
                  className="h-12 text-center font-mono text-lg tracking-[0.3em]"
                />
                <Button type="submit" disabled={isVerifying || otp.trim().length !== 6} className="h-12 px-5">
                  {isVerifying ? t("details.verifying") : t("details.verifyOtp")}
                </Button>
              </form>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {task.otpExpiresAt
                  ? t("details.otpExpiresIn", {
                      time: new Date(task.otpExpiresAt).toLocaleTimeString(),
                    })
                  : ""}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={handleResend} disabled={isResending} className="h-8 gap-1 text-xs">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {isResending ? t("details.resending") : t("details.resendOtp")}
              </Button>
            </div>

            <form onSubmit={handleComplete} className="space-y-4 border-t pt-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <DollarSign className="h-4 w-4 text-warning" aria-hidden="true" />
                  {t("details.codSectionTitle")}
                </h2>
              </div>
              {task.codAmount > 0 ? (
                <div className="space-y-1.5">
                  <label htmlFor="cod-collected" className="text-xs font-semibold text-muted-foreground">
                    {t("details.codCollectedLabel")} *
                  </label>
                  <Input
                    id="cod-collected"
                    type="number"
                    min={0}
                    value={collectedAmount ?? ""}
                    onChange={(event) =>
                      setCollectedAmount(event.target.value === "" ? undefined : Number(event.target.value))
                    }
                    className="h-12 font-mono text-lg"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("details.codMustMatch")} (৳{task.codAmount.toLocaleString()})
                  </p>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label htmlFor="delivery-remarks" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("details.remarksLabel")}
                </label>
                <Input
                  id="delivery-remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder={t("details.remarksPlaceholder")}
                  maxLength={500}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isCompleting} className="h-12 flex-1 gap-1.5 text-base">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  {isCompleting ? t("details.completing") : t("details.completeDelivery")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFailOpen(true)}
                  className="h-12 flex-1 gap-1.5 border-warning text-warning hover:bg-warning-soft"
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {t("details.attemptDelivery")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Attempt trail */}
      <Card>
        <CardContent className="p-0">
          <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <History className="h-4 w-4" aria-hidden="true" />
            {t("details.attemptsTitle")} ({task.attempts.length})
          </h2>
          {task.attempts.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">{t("details.noAttempts")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {task.attempts.map((attempt) => (
                <li key={attempt.id} className="space-y-1 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={attempt.outcome === "DELIVERED" ? "success" : "destructive"} className="text-[10px]">
                      #{attempt.attemptNumber} {attempt.outcome}
                    </Badge>
                    <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                      {new Date(attempt.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {attempt.failureReason ? (
                    <p className="font-semibold text-foreground">
                      {t(`failReasons.${attempt.failureReason}` as "failReasons.CUSTOMER_UNAVAILABLE")}
                    </p>
                  ) : null}
                  {attempt.notes ? <p className="text-muted-foreground">{attempt.notes}</p> : null}
                  {attempt.rescheduledFor ? (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {new Date(attempt.rescheduledFor).toLocaleString()}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Failed-attempt dialog */}
      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("details.failTitle")}</DialogTitle>
            <DialogDescription>{task.trackingCode}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFail} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fail-reason" className="text-xs font-semibold text-muted-foreground">
                {t("details.failReason")} *
              </label>
              <select
                id="fail-reason"
                value={failReason}
                onChange={(event) => setFailReason(event.target.value as DeliveryFailureReason)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm outline-none"
                required
              >
                {FAILURE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`failReasons.${reason}` as "failReasons.CUSTOMER_UNAVAILABLE")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fail-notes" className="text-xs font-semibold text-muted-foreground">
                {t("details.failNotes")}
              </label>
              <Input
                id="fail-notes"
                value={failNotes}
                onChange={(event) => setFailNotes(event.target.value)}
                placeholder={t("details.failNotesPlaceholder")}
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reschedule-date" className="text-xs font-semibold text-muted-foreground">
                {t("details.rescheduleLabel")}
              </label>
              <Input
                id="reschedule-date"
                type="datetime-local"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFailOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isFailing}>
                {isFailing ? t("details.submitting") : t("details.submitFailure")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
