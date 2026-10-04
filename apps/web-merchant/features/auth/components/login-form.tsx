"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { LogIn, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { useLoginMutation } from "../api/auth.api";
import { useAppDispatch } from "../../../store/hooks";
import { setCredentials } from "../../../store/auth.slice";
import { toast } from "sonner";

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [loginMutation, { isLoading }] = useLoginMutation();

  const handleDemoFill = () => {
    setEmailOrPhone("merchant@dhruto.com");
    setPassword("dhruto123");
    setErrorMessage(null);
  };

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
        router.push("/");
      }
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.message ||
        "Invalid email/phone or password. Please verify your credentials.";
      setErrorMessage(message);
      toast.error("Sign in failed", { description: message });
    }
  };

  return (
    <Card className="max-w-md mx-auto shadow-md border-primary/20">
      <CardHeader className="space-y-1">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
          <LogIn className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              {t("emailOrPhone")}
            </label>
            <Input
              type="text"
              placeholder="e.g. merchant@dhruto.com or 01712345678"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              {t("password")}
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDemoFill}
            className="w-full text-xs flex items-center justify-center gap-1.5 border-dashed"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {t("demoFill")}
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? t("signingIn") : t("signIn")}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              {t("registerNow")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
