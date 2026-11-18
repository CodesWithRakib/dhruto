"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import { KeyRound, CheckCircle2, RefreshCw } from "lucide-react";
import { useFormatters } from "@/lib/format";

interface TaskOtpSectionProps {
  otp: string;
  setOtp: (otp: string) => void;
  otpVerified: boolean;
  otpExpiresAt?: string | Date | null;
  isVerifying: boolean;
  isResending: boolean;
  onVerify: (event: React.FormEvent) => void;
  onResend: () => void;
}

export function TaskOtpSection({
  otp,
  setOtp,
  otpVerified,
  otpExpiresAt,
  isVerifying,
  isResending,
  onVerify,
  onResend,
}: TaskOtpSectionProps) {
  const t = useTranslations("Rider");
  const { time: fmtTime } = useFormatters();

  return (
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

        {otpVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success-soft-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Verified
          </span>
        ) : null}
      </div>

      {otpVerified ? (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl bg-success/15 px-4 py-3 text-xs font-bold text-success-soft-foreground"
        >
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>{t("details.otpVerified")} — Handover authorized.</span>
        </div>
      ) : (
        <form onSubmit={onVerify} className="space-y-3">
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
              className="h-12 flex-1 rounded-2xl bg-surface-muted/60 text-center font-mono text-xl tracking-[0.35em] font-black placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-sm placeholder:text-muted-foreground focus:bg-background"
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
              {otpExpiresAt
                ? t("details.otpExpiresIn", { time: fmtTime(otpExpiresAt) })
                : "Code sent via SMS"}
            </span>
            <button
              type="button"
              onClick={onResend}
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
  );
}
