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
import { UserPlus, AlertCircle, ArrowRight } from "lucide-react";
import { useRegisterMutation } from "../api/auth.api";
import { useAppDispatch } from "../../../store/hooks";
import { setCredentials } from "../../../store/auth.slice";
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
      setErrorMessage("Please fill in all required fields.");
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
        dispatch(
          setCredentials({
            user: res.data.user,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          }),
        );
        toast.success(`Merchant account created! Welcome, ${res.data.user.name}.`);
        router.push("/");
      }
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.message ||
        "Registration failed. Please verify your information.";
      setErrorMessage(message);
      toast.error("Registration failed", { description: message });
    }
  };

  return (
    <Card className="max-w-xl mx-auto shadow-md border-primary/20">
      <CardHeader className="space-y-1">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
          <UserPlus className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold">{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerSubtitle")}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                {t("fullName")} *
              </label>
              <Input
                type="text"
                placeholder="e.g. Tanvir Ahmed"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                {t("email")} *
              </label>
              <Input
                type="email"
                placeholder="e.g. merchant@mystore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                {t("phone")} *
              </label>
              <Input
                type="tel"
                placeholder="01712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                {t("password")} *
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              {t("businessName")} *
            </label>
            <Input
              type="text"
              placeholder="e.g. Dhaka Artisan Crafts"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              {t("pickupAddress")} *
            </label>
            <Input
              type="text"
              placeholder="e.g. House 14, Road 5, Dhanmondi, Dhaka"
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

          <div className="text-center text-xs text-muted-foreground">
            {t("alreadyAccount")}{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              {t("loginNow")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
