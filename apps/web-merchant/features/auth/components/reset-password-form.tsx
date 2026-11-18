"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { Button, Input } from "@dhruto/ui";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Lock, RefreshCw } from "lucide-react";
import { useResetPasswordMutation } from "../api/auth.api";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      toast.error("Password reset token is missing or invalid.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      await resetPassword({
        token: token.trim(),
        newPassword,
      }).unwrap();

      setSuccess(true);
      toast.success("Password updated successfully. You can now log in.");
    } catch {
      toast.error("Reset token is invalid or expired. Please request a new recovery link.");
    }
  };

  if (success) {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-2xl bg-success-soft/60 p-6 text-success-soft-foreground text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success-soft-foreground">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Password Reset Complete</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your new password has been safely stored. All existing sessions have been refreshed.
          </p>
        </div>

        <Button
          onClick={() => router.push("/login")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
        >
          <span>Continue to Sign In</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-display font-extrabold tracking-tight text-foreground">
          Set New Password
        </h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Please enter your secure new password below to regain access to your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialToken ? (
          <div className="relative">
            <label htmlFor="reset-token" className="sr-only">
              Reset Token
            </label>
            <Input
              id="reset-token"
              type="text"
              placeholder="Paste recovery token from email"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              required
              className="h-12 rounded-xl bg-background/60 font-mono text-xs"
            />
          </div>
        ) : null}

        <div className="relative">
          <label htmlFor="new-password" className="sr-only">
            New Password
          </label>
          <span className="pointer-events-none absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            placeholder="New password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isLoading}
            required
            className="h-12 rounded-xl bg-background/60 pl-12 pr-11 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative">
          <label htmlFor="confirm-password" className="sr-only">
            Confirm Password
          </label>
          <span className="pointer-events-none absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
            className="h-12 rounded-xl bg-background/60 pl-12 pr-11 text-sm"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold mt-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <span>Save & Update Password</span>
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
            <span>Cancel and return to Sign In</span>
          </Link>
        </p>
      </form>
    </div>
  );
}
