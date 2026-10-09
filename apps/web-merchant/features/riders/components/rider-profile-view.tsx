import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, Button, Input } from "@dhruto/ui";
import {
  User,
  Wallet,
  RefreshCw,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Power,
  ArrowUpRight,
} from "lucide-react";
import { RiderDutyStatus } from "@dhruto/contracts";
import {
  useGetRiderProfileQuery,
  useSetDutyMutation,
  useGetCashSummaryQuery,
  useGetCashHandInsQuery,
  useHandInCashMutation,
} from "../api/riders.api";
import { newIdempotencyKey } from "../../finance/api/finance.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { CASH_HANDIN_STATUS_TONE, RIDER_STATUS_TONE } from "@/config/status";

/** Rider profile: code, hub, duty toggle and the cash hand-in workflow. */
export function RiderProfileView() {
  const t = useTranslations("Rider");
  const { date: fmtDate, bdt } = useFormatters();
  const [handInNotes, setHandInNotes] = React.useState("");

  const {
    data: profileData,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useGetRiderProfileQuery();
  const { data: cashData, isFetching: cashFetching, refetch: refetchCash } = useGetCashSummaryQuery();
  const { data: handInsData } = useGetCashHandInsQuery();
  const handIns = handInsData?.data ?? [];
  const [setDuty, { isLoading: isToggling }] = useSetDutyMutation();
  const [handInCash, { isLoading: isHandingIn }] = useHandInCashMutation();

  const profile = profileData?.data;
  const cash = cashData?.data;
  const onDuty = profile?.duty === RiderDutyStatus.ON_DUTY;

  const handleDuty = async () => {
    try {
      const res = await setDuty({
        duty: onDuty ? RiderDutyStatus.OFF_DUTY : RiderDutyStatus.ON_DUTY,
      }).unwrap();
      if (res.success) {
        toast.success(res.message);
        refetchProfile();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("dutyBlocked")));
    }
  };

  const handleHandIn = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await handInCash({
        dto: { notes: handInNotes.trim() || undefined },
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      if (res.success) {
        toast.success(res.message);
        setHandInNotes("");
        refetchCash();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("handInCash")));
    }
  };

  if (profileLoading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="font-medium">{t("loading")}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="error"
        title={t("loading")}
        action={
          <Button variant="outline" size="sm" onClick={() => refetchProfile()}>
            {t("retry")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile & Duty Status */}
      <Card className="rounded-2xl border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 font-extrabold text-xl text-white shadow-md">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                </span>
                <span
                  className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card ${
                    onDuty ? "bg-emerald-500" : "bg-muted-foreground"
                  }`}
                  title={onDuty ? "On duty" : "Off duty"}
                >
                  <span className={`h-2 w-2 rounded-full ${onDuty ? "bg-white animate-pulse" : "bg-white/60"}`} />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-extrabold text-foreground">{profile.name}</h2>
                  <EnumBadge
                    namespace="RiderStatus"
                    value={profile.status}
                    tones={RIDER_STATUS_TONE}
                  />
                </div>
                <p className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground">
                  ID: <span className="text-foreground">{profile.riderCode}</span>
                </p>
              </div>
            </div>

            {/* Duty toggle button */}
            <div className="flex items-center gap-2.5">
              <Button
                variant={onDuty ? "outline" : "default"}
                onClick={handleDuty}
                disabled={isToggling}
                className={`h-11 gap-2 rounded-xl px-5 text-xs font-bold shadow-xs transition-all ${
                  onDuty
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300"
                    : "shadow-md hover:shadow-primary/25"
                }`}
              >
                <Power className="h-4 w-4" />
                {onDuty ? t("goOffDuty") : t("goOnDuty")}
              </Button>
            </div>
          </div>

          {/* Hub & Account Meta */}
          <div className="grid grid-cols-2 gap-3.5 rounded-2xl border border-border/70 bg-surface-muted/40 p-4 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Building className="h-3.5 w-3.5" />
                <span>{t("profile.hub")}</span>
              </div>
              <p className="mt-1 truncate text-xs font-bold text-foreground">
                {profile.hubName}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">Code: {profile.hubCode}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("profile.memberSince")}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-foreground">
                {fmtDate(profile.joinedAt)}
              </p>
              <p className="text-[11px] text-muted-foreground">Active courier account</p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Duty Mode
              </p>
              <p className={`mt-1 text-xs font-bold ${onDuty ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {onDuty ? "On duty (Dispatched)" : "Off duty (Standby)"}
              </p>
              <p className="text-[11px] text-muted-foreground">Live dispatch availability</p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("profile.riderCode")}
              </p>
              <p className="mt-1 font-mono text-xs font-extrabold text-foreground">
                {profile.riderCode}
              </p>
              <p className="text-[11px] text-muted-foreground">Rider identification</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Cash In Hand & Settlement */}
      <Card className="rounded-2xl border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-warning/25 bg-warning-soft text-warning-soft-foreground shadow-2xs">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  {t("profile.cashTitle")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Track collections and submit cash directly to your designated hub
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchCash()}
              className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground shadow-2xs hover:bg-surface-muted hover:text-foreground"
              aria-label="Refresh cash records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${cashFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {/* 3 Metric Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* 1. To Hand In */}
            <div className="flex items-start justify-between rounded-xl border border-border/80 bg-surface-muted/30 p-4 transition-all hover:bg-surface-muted/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("profile.pendingHandIn")}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      (cash?.pendingHandIn ?? 0) > 0
                        ? "border border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                        : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    }`}
                  >
                    {(cash?.pendingHandIn ?? 0) > 0 ? "Action required" : "Settled"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground">
                  {bdt(cash?.pendingHandIn ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">In rider possession</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-2xs">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            {/* 2. Awaiting Verification */}
            <div className="flex items-start justify-between rounded-xl border border-border/80 bg-surface-muted/30 p-4 transition-all hover:bg-surface-muted/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("profile.awaitingVerification")}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-200">
                    Pending
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground">
                  {bdt(cash?.awaitingVerification ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Submitted to hub</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-2xs">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            {/* 3. Verified by Hub */}
            <div className="flex items-start justify-between rounded-xl border border-border/80 bg-surface-muted/30 p-4 transition-all hover:bg-surface-muted/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("profile.verified")}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                    Reconciled
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground">
                  {bdt(cash?.verifiedByHub ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Hub reconciled</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          {/* Hand In Deposit Form or Inline Status Banner */}
          {(cash?.pendingHandIn ?? 0) > 0 ? (
            <form onSubmit={handleHandIn} className="space-y-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4.5 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Hand in cash to hub</h4>
                  <p className="text-xs text-muted-foreground">
                    Deposit {bdt(cash?.pendingHandIn ?? 0)} collected cash at {profile.hubName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Deposit amount:</span>
                  <span className="font-mono text-base font-extrabold text-amber-700 dark:text-amber-300">
                    {bdt(cash?.pendingHandIn ?? 0)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Input
                  value={handInNotes}
                  onChange={(event) => setHandInNotes(event.target.value)}
                  placeholder={t("profile.handInNotes")}
                  maxLength={500}
                  aria-label={t("profile.handInNotes")}
                  className="h-11 flex-1 rounded-xl border-input/80 bg-surface shadow-2xs text-sm"
                />
                <Button
                  type="submit"
                  disabled={isHandingIn}
                  className="h-11 shrink-0 gap-2 rounded-xl px-6 text-xs font-bold shadow-md hover:shadow-primary/25"
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  {isHandingIn ? t("profile.handingIn") : t("profile.handIn")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-muted/30 px-4 py-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-foreground">{t("profile.handInEmpty")}</span>
              </div>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Zero Balance
              </span>
            </div>
          )}

          {/* Recent Hand-In Batches */}
          {handIns.length > 0 ? (
            <div className="space-y-3 border-t border-border/70 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Recent Hand-in Batches
                  </p>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
                    {handIns.length} recorded
                  </span>
                </div>
              </div>
              <ul className="space-y-2">
                {handIns.slice(0, 5).map((batch) => (
                  <li
                    key={batch.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface px-4 py-3 text-xs shadow-2xs transition-colors hover:bg-surface-muted/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted font-mono text-xs font-bold text-foreground">
                        #
                      </span>
                      <div>
                        <span className="font-mono font-bold text-foreground">{batch.handinCode}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {batch.itemCount} parcel{batch.itemCount === 1 ? "" : "s"} · {fmtDate(batch.submittedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                        {bdt(batch.expectedMinor / 100)}
                      </span>
                      <EnumBadge
                        namespace="CashHandInStatus"
                        value={batch.status}
                        tones={CASH_HANDIN_STATUS_TONE}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
