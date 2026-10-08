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
import { UserPlus, AlertCircle, ArrowRight } from "lucide-react";
import { useRegisterMutation } from "../api/auth.api";
import { useAppDispatch } from "../../../store/hooks";
import { setCredentials } from "../../../store/auth.slice";
import { getApiErrorMessage } from "../../../lib/api-error";
import { homeForRole } from "@/config/roles";
import { toast } from "sonner";

export function RegisterForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [registerMutation, { isLoading }] = useRegisterMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || !email || !phone || !password || !businessName || !pickupAddress) {
      setErrorMessage(t("requiredFields"));
      return;
    }

    try {
      const res = await registerMutation({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: "MERCHANT",
        businessName: businessName.trim(),
        pickupAddress: pickupAddress.trim(),
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
        toast.success(t("accountCreated", { name: payloadData.user.name }));
        // New merchants land on their own dashboard.
        router.replace(homeForRole(payloadData.user.role).href);
      }
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        t("registrationFailedDesc"),
      );
      setErrorMessage(message);
      toast.error(t("registrationFailed"), { description: message });
    }
  };

  return (
    <Card className="mx-auto w-full max-w-xl border-border">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <UserPlus className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold">{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerSubtitle")}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-soft p-3 text-body text-danger-soft-foreground">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-label leading-none">{t("fullName")} *</label>
              <Input
                type="text"
                placeholder={t("fullNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-label leading-none">{t("email")} *</label>
              <Input
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-label leading-none">{t("phone")} *</label>
              <Input
                type="tel"
                placeholder={t("phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-label leading-none">{t("password")} *</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-label leading-none">{t("businessName")} *</label>
              <Input
                type="text"
                placeholder={t("businessNamePlaceholder")}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-label leading-none">{t("pickupAddress")} *</label>
              <Input
                type="text"
                placeholder={t("pickupAddressPlaceholder")}
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? t("registering") : t("registerBtn")}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="text-center text-caption text-muted-foreground">
            {t("alreadyAccount")}{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              {t("loginNow")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
