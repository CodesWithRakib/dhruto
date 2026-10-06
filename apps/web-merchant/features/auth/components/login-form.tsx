"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@dhruto/ui";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useLoginMutation } from "../api/auth.api";
import { useAppDispatch } from "../../../store/hooks";
import { setCredentials } from "../../../store/auth.slice";
import { getApiErrorMessage } from "../../../lib/api-error";
import { homeForRole } from "@/config/roles";
import { toast } from "sonner";
import { Logo } from "@dhruto/ui";

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
    <Card className="mx-auto w-full max-w-md border-border shadow-md">
      <CardHeader className="space-y-2 text-center pb-4">
        <div className="flex justify-center mb-1">
          <Logo size="default" />
        </div>
        <div>
          <CardTitle className="text-h2">{t("loginTitle")}</CardTitle>
          <CardDescription className="mt-1 text-body-sm text-muted-foreground">
            {t("loginSubtitle")}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-soft p-3 text-body-sm text-danger-soft-foreground">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-body-sm font-semibold text-foreground">
              {t("emailOrPhone")}
            </label>
            <Input
              id="login-email"
              type="text"
              autoComplete="username"
              placeholder="merchant@shop.com"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              disabled={isLoading}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-body-sm font-semibold text-foreground">
              {t("password")}
            </label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="h-11 pr-10"
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
          </div>

          <div className="flex items-center justify-between text-body-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span>{t("rememberMe")}</span>
            </label>

            <Link
              href="/contact"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            size="lg"
            className="w-full flex items-center justify-center gap-2 h-11 text-base font-semibold shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? t("signingIn") : t("signIn")}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="text-center text-caption text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href="/register"
              className="text-primary font-semibold hover:underline"
            >
              {t("registerNow")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
