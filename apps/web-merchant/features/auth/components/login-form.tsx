"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useLoginMutation } from "../api/auth.api";
import { useAppDispatch } from "../../../store/hooks";
import { setCredentials } from "../../../store/auth.slice";
import { getApiErrorMessage } from "../../../lib/api-error";
import { homeForRole } from "@/config/roles";
import { toast } from "sonner";

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [loginMutation, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailOrPhone.trim() || !password) {
      setErrorMessage("Please enter both email/phone and password.");
      return;
    }

    try {
      const res = await loginMutation({
        emailOrPhone: emailOrPhone.trim(),
        password,
      }).unwrap();

      if (res.success && res.data) {
        const payloadData = res.data;
        const accessToken = payloadData.tokens?.accessToken ?? payloadData.accessToken;
        const refreshToken = payloadData.tokens?.refreshToken ?? payloadData.refreshToken;

        dispatch(
          setCredentials({
            user: payloadData.user,
            accessToken,
            refreshToken,
          }),
        );
        toast.success(`Welcome back, ${payloadData.user.name}!`);
        // Route each role to its own application surface.
        router.replace(homeForRole(payloadData.user.role).href);
      }
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Invalid email/phone or password. Please verify your credentials.",
      );
      setErrorMessage(message);
      toast.error("Sign in failed", { description: message });
    }
  };

  return (
    <div className="w-full">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Welcome Back
      </span>

      <h1 className="mt-4 text-4xl font-extrabold leading-tight text-foreground">
        {t("loginTitle")}
      </h1>
      <p className="mt-2 text-body-sm text-muted-foreground">{t("loginSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-danger-soft p-3 text-body-sm text-danger-soft-foreground"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="relative">
          <label htmlFor="login-email" className="sr-only">
            {t("emailOrPhone")}
          </label>
          <span className="pointer-events-none absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </span>
          <Input
            id="login-email"
            type="text"
            autoComplete="username"
            placeholder={t("emailOrPhone")}
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            disabled={isLoading}
            required
            className="h-12 rounded-xl bg-background/60 pl-12"
          />
        </div>

        <div className="relative">
          <label htmlFor="login-password" className="sr-only">
            {t("password")}
          </label>
          <span className="pointer-events-none absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            className="h-12 rounded-xl bg-background/60 pl-12 pr-11"
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

        <div className="flex items-center justify-between text-body-sm">
          <label className="flex cursor-pointer select-none items-center gap-2 text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <span>{t("rememberMe")}</span>
          </label>
          <Link href="/contact" className="text-xs font-semibold text-primary hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>

        <Button
          id="login-submit"
          type="submit"
          size="lg"
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
          disabled={isLoading}
        >
          {isLoading ? t("signingIn") : t("signIn")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </form>

      <p className="mt-8 text-center text-body-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {t("registerNow")}
        </Link>
      </p>
    </div>
  );
}
