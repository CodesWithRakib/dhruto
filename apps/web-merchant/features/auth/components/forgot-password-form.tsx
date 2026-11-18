"use client";

import React, { useState } from "react";
import { Link } from "@/lib/navigation";
import { Button, Input } from "@dhruto/ui";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail, RefreshCw } from "lucide-react";
import { useForgotPasswordMutation } from "../api/auth.api";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please provide your registered account email.");
      return;
    }

    try {
      const res = await forgotPassword({ email: email.trim().toLowerCase() }).unwrap();
      setSubmitted(true);
      if (res.data?.resetToken) {
        setDevResetToken(res.data.resetToken);
      }
      toast.success("Password recovery instructions sent.");
    } catch {
      toast.error("Failed to process recovery request. Please try again.");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-display font-extrabold tracking-tight text-foreground">
          Reset Password
        </h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Enter your registered email address and we will send you a recovery link to reset your credentials.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-success-soft/60 p-5 text-sm text-success-soft-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Check your inbox</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If an account is associated with <span className="font-semibold text-foreground">{email}</span>, we have sent a secure password reset link. Please check your spam folder if it doesn’t arrive within a few minutes.
                </p>
              </div>
            </div>
          </div>

          {devResetToken ? (
            <div className="rounded-xl bg-surface-muted/50 p-4 text-xs space-y-2">
              <p className="font-semibold text-foreground">Development Mode Shortcut:</p>
              <Link
                href={`/reset-password?token=${devResetToken}`}
                className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
              >
                <span>Click here to set new password now</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-surface-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label htmlFor="recovery-email" className="sr-only">
              Email Address
            </label>
            <span className="pointer-events-none absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
            <Input
              id="recovery-email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className="h-12 rounded-xl bg-background/60 pl-12 text-sm"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Sending Instructions...</span>
              </>
            ) : (
              <>
                <span>Send Reset Instructions</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
