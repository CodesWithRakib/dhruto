"use client";

import React, { useState } from "react";
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
import {
  Package,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Search,
  Check,
} from "lucide-react";
import { useParseAddressMutation, useEvaluateRecipientRiskMutation } from "../../intelligence/api/intelligence.api";
import { type AddressParseResult, type RecipientRiskResult } from "@dhruto/contracts";
import { toast } from "sonner";

import { Link } from "@/lib/navigation";

export function BookingForm() {
  const t = useTranslations("BookingForm");
  const { form, onSubmit, isLoading, createdParcel, serverError, resetForm } =
    useParcelBooking();

  const [showSmartFill, setShowSmartFill] = useState(false);
  const [smartAddressInput, setSmartAddressInput] = useState("");
  const [parsedMeta, setParsedMeta] = useState<AddressParseResult | null>(null);

  const [parseAddress, { isLoading: isParsingAddress }] = useParseAddressMutation();
  const [evaluateRisk, { data: riskResp, isLoading: isEvaluatingRisk }] = useEvaluateRecipientRiskMutation();
  const riskProfile: RecipientRiskResult | undefined = riskResp?.data;

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

  const handleSmartParseAndFill = async () => {
    const query = smartAddressInput.trim();
    if (!query || query.length < 3) {
      toast.error("Please enter a raw address to parse.");
      return;
    }
    try {
      const res = await parseAddress({ rawAddress: query }).unwrap();
      if (res.data) {
        setParsedMeta(res.data);
        form.setValue("district", res.data.district, { shouldValidate: true, shouldDirty: true });
        form.setValue("thana", res.data.thana, { shouldValidate: true, shouldDirty: true });
        form.setValue("deliveryAddress", query, { shouldValidate: true, shouldDirty: true });
        toast.success(`Auto-filled: ${res.data.thana}, ${res.data.district} (${res.data.confidenceScore}% confidence)`);
      }
    } catch {
      toast.error("Failed to parse address.");
    }
  };

  const handleRiskPreCheck = async () => {
    const phone = form.getValues("recipientPhone")?.trim();
    const address = form.getValues("deliveryAddress")?.trim() || form.getValues("thana") || "Dhaka";
    const cod = form.getValues("codAmount") || 0;

    if (!phone || phone.length < 10) {
      toast.error("Enter a valid recipient phone number first");
      return;
    }

    try {
      await evaluateRisk({
        recipientPhone: phone,
        codAmount: Number(cod),
        rawAddress: address,
      }).unwrap();
      toast.success("Recipient risk evaluated!");
    } catch {
      toast.error("Failed to evaluate risk");
    }
  };

  if (createdParcel) {
    return (
      <Card className="max-w-xl mx-auto border-border shadow-lg p-6 sm:p-8 text-center">
        {/* Big circular green checkmark with ripple */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>

        <h2 className="text-2xl font-bold text-foreground">
          বুকিং সফল হয়েছে!
        </h2>
        <p className="mt-1 text-body-sm text-muted-foreground">
          আপনার পার্সেলটি সফলভাবে বুক হয়েছে।
        </p>

        {/* Receipt Container */}
        <div className="mt-6 rounded-xl border border-border bg-surface-muted/50 p-4 sm:p-5 text-left space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                ট্র্যাকিং নম্বর
              </span>
              <p className="font-mono text-lg font-bold text-foreground tracking-wide">
                {createdParcel.trackingCode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(createdParcel.trackingCode);
                toast.success("ট্র্যাকিং কোড কপি করা হয়েছে!");
              }}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              কপি করুন
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-muted-foreground block font-medium">রিসিভিয়েন্ট</span>
              <span className="font-semibold text-foreground text-body-sm">{createdParcel.recipientName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">মোবাইল</span>
              <span className="font-mono font-medium text-foreground text-body-sm">{createdParcel.recipientPhone}</span>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">গন্তব্য</span>
              <span className="font-medium text-foreground">{createdParcel.district}, {createdParcel.thana}</span>
            </div>
            <div>
              <span className="text-muted-foreground block font-medium">COD পরিমাণ</span>
              <span className="font-bold text-foreground">৳ {createdParcel.codAmount.toLocaleString()}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-border flex justify-between items-center text-body-sm">
              <span className="font-medium text-muted-foreground">ডেলিভারি চার্জ</span>
              <span className="font-bold text-foreground">৳ {createdParcel.deliveryFee}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link href="/merchant/parcels">
            <Button size="lg" className="w-full font-semibold h-11">
              অর্ডার লিস্ট দেখুন
            </Button>
          </Link>
          <Button variant="outline" size="lg" onClick={resetForm} className="w-full h-11">
            আরেকটি বুকিং করুন
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 3-Step Progress Indicator matching design.png */}
      <div className="flex items-center justify-between px-6 py-3 rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
            ১
          </span>
          <span className="text-body-sm font-bold text-foreground">
            বেসিক তথ্য
          </span>
        </div>
        <div className="h-[2px] flex-1 mx-3 bg-primary/20" />
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-muted text-muted-foreground text-xs font-bold">
            ২
          </span>
          <span className="text-body-sm font-medium text-muted-foreground">
            পার্সেল ডিটেইলস
          </span>
        </div>
        <div className="h-[2px] flex-1 mx-3 bg-border" />
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-muted text-muted-foreground text-xs font-bold">
            ৩
          </span>
          <span className="text-body-sm font-medium text-muted-foreground">
            রিভিউ
          </span>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSmartFill(!showSmartFill)}
              className="flex items-center gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
            >
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              {showSmartFill ? "Hide Smart Auto-Fill" : "✨ Smart Address Auto-Fill"}
            </Button>
          </div>
        </CardHeader>

      <CardContent>
        {/* Smart Auto-Fill Drawer/Accordion */}
        {showSmartFill && (
          <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-warning" />
                AI Address Extractor & Normalizer
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Supports English & Bengali
              </span>
            </div>

            <div className="flex gap-2">
              <Input
                value={smartAddressInput}
                onChange={(e) => setSmartAddressInput(e.target.value)}
                placeholder="e.g. House 42, Road 7, Banani, Dhaka-1213 or মিরপুর ১০, ঢাকা"
                className="text-sm bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSmartParseAndFill();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSmartParseAndFill}
                disabled={isParsingAddress || !smartAddressInput.trim()}
                className="shrink-0 flex items-center gap-1 text-xs"
              >
                <Search className="h-3.5 w-3.5" />
                {isParsingAddress ? "Parsing..." : "Auto-Fill"}
              </Button>
            </div>

            {parsedMeta && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-primary/10">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span>
                    Detected: <strong>{parsedMeta.thana}</strong>, <strong>{parsedMeta.district}</strong>
                    {parsedMeta.postalCode && ` (${parsedMeta.postalCode})`}
                  </span>
                </div>
                <Badge variant={parsedMeta.confidenceTier === "HIGH" ? "success" : parsedMeta.confidenceTier === "MEDIUM" ? "warning" : "destructive"}>
                  {parsedMeta.confidenceScore}% Confidence
                </Badge>
              </div>
            )}
          </div>
        )}

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
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("recipientPhone")}</FormLabel>
                      {field.value && field.value.length === 11 && (
                        <button
                          type="button"
                          onClick={handleRiskPreCheck}
                          disabled={isEvaluatingRisk}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {isEvaluatingRisk ? "Checking Risk..." : "Pre-Check RTO Risk"}
                        </button>
                      )}
                    </div>
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

            {/* Live Risk Badge if evaluated */}
            {riskProfile && (
              <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${riskProfile.riskTier === "LOW" ? "bg-success-soft border-success text-success  " : riskProfile.riskTier === "MEDIUM" ? "bg-warning-soft border-warning text-warning  " : "bg-danger-soft border-danger text-danger  "}`}>
                <div className="flex items-center gap-2">
                  {riskProfile.riskTier === "LOW" ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  <span>
                    Recipient Risk: <strong>{riskProfile.riskTier}</strong> (RTO Prob: {riskProfile.rtoProbability}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{riskProfile.deliveryHistory.deliveredOrders} delivered / {riskProfile.deliveryHistory.returnedOrders} returns</span>
                  <Badge variant={riskProfile.safeToDispatch ? "success" : "destructive"}>
                    {riskProfile.safeToDispatch ? "Safe" : "Review"}
                  </Badge>
                </div>
              </div>
            )}

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
    </div>
  );
}
