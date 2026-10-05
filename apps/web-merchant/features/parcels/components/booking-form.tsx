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
  RotateCcw,
  Truck,
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
    const normalized = (createdParcel as any).normalizedAddress;
    return (
      <Card className="max-w-2xl mx-auto border-primary/20 ">
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

            {normalized && (
              <div className="col-span-full border-t pt-3 mt-1 bg-primary/5 rounded-lg p-3 space-y-1.5 border border-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5 text-warning" />
                    <span>Cognitive Intelligence Normalized</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    {normalized.confidenceScore}% Confidence ({normalized.confidenceTier})
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Zone: <strong className="text-foreground">{normalized.zone}</strong></span>
                  {normalized.riskTier && (
                    <span>
                      RTO Risk:{" "}
                      <strong className={normalized.riskTier === "LOW" ? "text-success" : normalized.riskTier === "MEDIUM" ? "text-warning" : "text-danger"}>
                        {normalized.riskTier} ({normalized.rtoProbability ?? 0}%)
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}
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
    <Card className="max-w-2xl mx-auto ">
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
  );
}
