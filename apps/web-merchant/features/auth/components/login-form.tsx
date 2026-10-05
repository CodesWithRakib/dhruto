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
        dispatch(
          setCredentials({
            user: res.data.user,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          }),
        );
        toast.success(`Welcome back, ${res.data.user.name}!`);
        // Route each role to its own application surface.
        router.replace(homeForRole(res.data.user.role).href);
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
          <CardTitle className="text-2xl font-bold text-foreground">
            Merchant Portal
          </CardTitle>
          <CardDescription className="text-body-sm text-muted-foreground mt-1">
            আপনার ব্যবসার সাথে আমরা আছি
          </CardDescription>
        </div>

        {/* Friendly merchant illustration banner */}
        <div className="mx-auto mt-2 flex h-24 w-full max-w-xs items-center justify-center rounded-xl bg-gradient-to-b from-emerald-50 to-emerald-100/40 p-2">
          <svg viewBox="0 0 200 90" className="h-full w-auto">
            {/* Store awning */}
            <path d="M40 25 Q100 10 160 25 L155 35 L45 35 Z" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" />
            <path d="M45 35 Q55 42 65 35 Q75 42 85 35 Q95 42 105 35 Q115 42 125 35 Q135 42 145 35 Q155 42 155 35" fill="none" stroke="#16A34A" strokeWidth="1.5" />
            {/* Counter */}
            <rect x="50" y="65" width="100" height="20" rx="3" fill="#0F5132" />
            {/* Parcel on counter */}
            <rect x="60" y="55" width="22" height="15" rx="2" fill="#F59E0B" />
            <line x1="60" y1="62" x2="82" y2="62" stroke="#B45309" strokeWidth="1" />
            {/* Person behind counter */}
            <circle cx="115" cy="40" r="11" fill="#1E293B" />
            <path d="M102 65 C102 52 110 51 115 51 C120 51 128 52 128 65 Z" fill="#15803D" />
          </svg>
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
            <label className="text-body-sm font-semibold text-foreground">
              ইমেইল / মোবাইল
            </label>
            <Input
              type="text"
              placeholder="merchant@shop.com"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              disabled={isLoading}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-body-sm font-semibold text-foreground">
              পাসওয়ার্ড
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
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
