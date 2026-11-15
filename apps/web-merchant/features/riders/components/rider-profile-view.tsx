"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@dhruto/ui";
import { RefreshCw, AlertTriangle } from "lucide-react";
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
import { RiderProfileHeaderCard } from "./profile/rider-profile-header-card";
import { RiderCashSummaryCard } from "./profile/rider-cash-summary-card";
import { RiderHandInsHistoryCard } from "./profile/rider-handins-history-card";

/** Rider profile: code, hub, duty toggle and the cash hand-in workflow. */
export function RiderProfileView() {
  const t = useTranslations("Rider");
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
      <RiderProfileHeaderCard
        profile={profile}
        onDuty={onDuty}
        isToggling={isToggling}
        onDutyToggle={handleDuty}
      />

      {/* Cash In Hand & Settlement */}
      <RiderCashSummaryCard
        cash={cash}
        hubName={profile.hubName}
        cashFetching={cashFetching}
        onRefreshCash={() => refetchCash()}
        handInNotes={handInNotes}
        setHandInNotes={setHandInNotes}
        isHandingIn={isHandingIn}
        onHandIn={handleHandIn}
      />

      {/* Recent Hand-In Batches */}
      <RiderHandInsHistoryCard handIns={handIns} />
    </div>
  );
}
