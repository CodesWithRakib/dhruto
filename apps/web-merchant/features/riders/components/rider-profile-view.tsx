"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button, Badge, Input } from "@dhruto/ui";
import { User, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import { RiderDutyStatus } from "@dhruto/contracts";
import {
  useGetRiderProfileQuery,
  useSetDutyMutation,
  useGetCashSummaryQuery,
  useHandInCashMutation,
} from "../api/riders.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";

/** Rider profile: code, hub, duty toggle and the cash hand-in workflow. */
export function RiderProfileView() {
  const t = useTranslations("Rider");
  const [handInNotes, setHandInNotes] = React.useState("");

  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } =
    useGetRiderProfileQuery();
  const { data: cashData, refetch: refetchCash } = useGetCashSummaryQuery();
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
      const res = await handInCash({ notes: handInNotes.trim() || undefined }).unwrap();
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
      <p role="status" className="py-16 text-center text-sm text-muted-foreground">
        {t("loading")}
      </p>
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
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              <User className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">{profile.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{profile.riderCode}</p>
            </div>
            <Badge variant={onDuty ? "success" : "secondary"} className="ml-auto text-[11px]">
              {onDuty ? t("onDuty") : t("offDuty")}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.hub")}</dt>
              <dd className="font-semibold text-foreground">
                {profile.hubName} ({profile.hubCode})
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.status")}</dt>
              <dd className="font-semibold text-foreground">{profile.status}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.memberSince")}</dt>
              <dd className="text-foreground">{new Date(profile.joinedAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.riderCode")}</dt>
              <dd className="font-mono text-foreground">{profile.riderCode}</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            onClick={handleDuty}
            disabled={isToggling}
            className="h-11 w-full"
          >
            {onDuty ? t("goOffDuty") : t("goOnDuty")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Wallet className="h-4 w-4 text-warning" aria-hidden="true" />
            {t("profile.cashTitle")}
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-muted p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("profile.pendingHandIn")}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums">
                ৳{(cash?.pendingHandIn ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-surface-muted p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("profile.awaitingVerification")}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums">
                ৳{(cash?.awaitingVerification ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-surface-muted p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("profile.verified")}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums">
                ৳{(cash?.verifiedByHub ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          {(cash?.pendingHandIn ?? 0) > 0 ? (
            <form onSubmit={handleHandIn} className="space-y-2 border-t pt-3">
              <Input
                value={handInNotes}
                onChange={(event) => setHandInNotes(event.target.value)}
                placeholder={t("profile.handInNotes")}
                maxLength={500}
                aria-label={t("profile.handInNotes")}
              />
              <Button type="submit" disabled={isHandingIn} className="h-11 w-full gap-1.5">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {isHandingIn ? t("profile.handingIn") : t("profile.handIn")}
              </Button>
            </form>
          ) : (
            <p className="border-t pt-3 text-center text-xs text-muted-foreground">
              {t("profile.handInEmpty")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
