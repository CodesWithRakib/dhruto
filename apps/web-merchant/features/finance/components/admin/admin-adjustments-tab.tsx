"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import { RefreshCw } from "lucide-react";

interface AdminAdjustmentsTabProps {
  adjustMerchant: string;
  setAdjustMerchant: (v: string) => void;
  adjustDirection: "CREDIT" | "DEBIT";
  setAdjustDirection: (v: "CREDIT" | "DEBIT") => void;
  adjustAmount: string;
  setAdjustAmount: (v: string) => void;
  adjustReason: string;
  setAdjustReason: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAdjusting: boolean;
}

export function AdminAdjustmentsTab({
  adjustMerchant,
  setAdjustMerchant,
  adjustDirection,
  setAdjustDirection,
  adjustAmount,
  setAdjustAmount,
  adjustReason,
  setAdjustReason,
  onSubmit,
  isAdjusting,
}: AdminAdjustmentsTabProps) {
  const t = useTranslations("Finance");

  return (
    <Card className="rounded-3xl bg-surface-elevated p-6 sm:p-8">
      <CardContent className="p-0">
        <div className="max-w-2xl space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-foreground">{t("admin.adjustTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.adjustMessage")}</p>
          </div>

          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="adjust-merchant" className="text-xs font-bold text-foreground">
                {t("admin.form.merchantIdLabel")}
              </label>
              <Input
                id="adjust-merchant"
                value={adjustMerchant}
                onChange={(e) => setAdjustMerchant(e.target.value)}
                placeholder={t("admin.form.merchantIdPlaceholder")}
                required
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("admin.form.merchantIdHelper")}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="adjust-direction" className="text-xs font-bold text-foreground">
                {t("admin.adjustDirection")} *
              </label>
              <Select
                value={adjustDirection}
                onValueChange={(val) => setAdjustDirection(val as "CREDIT" | "DEBIT")}
              >
                <SelectTrigger id="adjust-direction" className="w-full">
                  <SelectValue placeholder={t("admin.adjustDirection")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">{t("admin.adjustCredit")}</SelectItem>
                  <SelectItem value="DEBIT">{t("admin.adjustDebit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="adjust-amount" className="text-xs font-bold text-foreground">
                {t("admin.form.amountLabel")}
              </label>
              <Input
                id="adjust-amount"
                type="number"
                min={0.01}
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="0.00"
                required
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="adjust-reason" className="text-xs font-bold text-foreground">
                {t("admin.adjustReason")} *
              </label>
              <Input
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                maxLength={500}
                placeholder={t("admin.form.reasonPlaceholder")}
                required
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <Button type="submit" disabled={isAdjusting} className="h-11 w-full font-bold">
                {isAdjusting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("confirm")}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
