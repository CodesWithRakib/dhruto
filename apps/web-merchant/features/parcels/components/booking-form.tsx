"use client";

import React from "react";
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  Badge,
} from "@dhruto/ui";
import { useParcelBooking } from "../hooks/use-parcel-booking";
import { Package, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Truck } from "lucide-react";

import Link from "next/link";

export function BookingForm() {
  const t = useTranslations("BookingForm");
  const { form, onSubmit, isLoading, createdParcel, serverError, resetForm } =
    useParcelBooking();

  const watchWeight = form.watch("weight") || 1;
  const watchDistrict = (form.watch("district") || "").toLowerCase().trim();
  const isOutside =
    watchDistrict &&
    watchDistrict !== "dhaka" &&
    watchDistrict !== "gazipur" &&
    watchDistrict !== "narayanganj";
  const isSuburb = watchDistrict === "gazipur" || watchDistrict === "narayanganj";
  const base = isOutside ? 130 : isSuburb ? 100 : 60;
  const extraKg = Math.max(0, Math.ceil(watchWeight - 1));
  const estimatedFee = base + extraKg * (isOutside ? 25 : 20);

  if (createdParcel) {
    return (
      <Card className="max-w-2xl mx-auto border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 border-b border-primary/10 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <CardTitle className="text-xl text-foreground">
                {t("successTitle")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t("successDescription")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="bg-muted/50 border border-border rounded-lg p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("trackingCode")}
              </span>
              <p className="text-xl font-mono font-bold text-foreground">
                {createdParcel.trackingCode}
              </p>
            </div>
            <Badge variant="success" className="w-fit">
              {t("status", { status: createdParcel.status })}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {t("recipient")}
              </span>
              <p className="font-medium text-foreground">{createdParcel.recipientName}</p>
              <p className="font-mono text-muted-foreground">{createdParcel.recipientPhone}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {t("destination")}
              </span>
              <p className="font-medium text-foreground">
                {createdParcel.thana}, {createdParcel.district}
              </p>
              <p className="text-muted-foreground text-xs">{createdParcel.deliveryAddress}</p>
            </div>

            <div className="space-y-1 border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {t("weight")}
              </span>
              <p className="font-medium text-foreground">{createdParcel.weight} kg</p>
            </div>

            <div className="space-y-1 border-t pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {t("codAmount")}
              </span>
              <p className="font-medium text-foreground">৳{createdParcel.codAmount}</p>
            </div>

            <div className="space-y-1 border-t pt-3 col-span-full">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {t("deliveryCharge")}
              </span>
              <p className="text-lg font-bold text-foreground">
                ৳{createdParcel.deliveryFee}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 p-4">
          <Button variant="outline" onClick={resetForm} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("bookAnother")}
          </Button>
          <div className="flex items-center gap-2">
            <Link href={`/parcels/${createdParcel.id}`}>
              <Button variant="outline" className="flex items-center gap-1.5">
                <ArrowRight className="h-4 w-4" />
                {t("viewDetails")}
              </Button>
            </Link>
            <Link href={`/parcels/${createdParcel.id}/label`}>
              <Button variant="default" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {t("printLabel")}
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t("description")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {serverError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{t("submissionError")}</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form id="parcel-booking-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipientName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("recipientNamePlaceholder")}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipientPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("recipientPhonePlaceholder")}
                        maxLength={11}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("recipientPhoneHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("district")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("districtPlaceholder")}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("thana")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("thanaPlaceholder")}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("address")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("addressPlaceholder")}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("weight")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        placeholder="1.0"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("weightHint", { fee: estimatedFee })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("cod")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="500000"
                        placeholder="0"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("codHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-end gap-3 border-t bg-muted/30 p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isLoading}
        >
          {t("reset")}
        </Button>
        <Button
          type="submit"
          form="parcel-booking-form"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {t("confirming")}
            </>
          ) : (
            <>
              {t("confirm")}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
