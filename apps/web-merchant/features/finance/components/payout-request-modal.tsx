"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { PayoutMethod } from "@dhruto/contracts";
import { useRequestPayoutMutation, newIdempotencyKey } from "../api/finance.api";
import { X, CheckCircle, AlertCircle, Building2, Smartphone, ArrowRight, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@dhruto/ui";
import { getApiErrorMessage } from "@/lib/api-error";

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
}

const METHODS: Array<{ method: PayoutMethod; label: string }> = [
  { method: PayoutMethod.BKASH, label: "bKash" },
  { method: PayoutMethod.NAGAD, label: "Nagad" },
  { method: PayoutMethod.ROCKET, label: "Rocket" },
  { method: PayoutMethod.BANK_TRANSFER, label: "Bank" },
];

/**
 * Payout request with an explicit review step. The submission carries an
 * idempotency key generated once per modal session, so double-clicks and
 * retries replay instead of double-spending.
 */
export function PayoutRequestModal({ isOpen, onClose, availableBalance }: PayoutRequestModalProps) {
  const t = useTranslations("Finance");
  const [method, setMethod] = React.useState<PayoutMethod>(PayoutMethod.BKASH);
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountType, setAccountType] = React.useState<"PERSONAL" | "MERCHANT">("PERSONAL");
  const [bankName, setBankName] = React.useState("");
  const [branchName, setBranchName] = React.useState("");
  const [accountHolderName, setAccountHolderName] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");
  const [reviewing, setReviewing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const idempotencyKey = React.useMemo(() => newIdempotencyKey(), []);

  const [requestPayout, { isLoading }] = useRequestPayoutMutation();

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isOverBalance = numAmount > availableBalance;
  const isUnderMin = numAmount < 100 && numAmount > 0;

  const handleQuickAmount = (val: number) => {
    setAmount(Math.min(val, availableBalance).toString());
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (numAmount < 100) {
      setErrorMsg(t("payout.minimum"));
      return;
    }
    if (numAmount > availableBalance) {
      setErrorMsg(t("payout.availableNow"));
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMsg(t("accountNumber"));
      return;
    }
    setReviewing(true);
  };

  const reset = () => {
    setReviewing(false);
    setSuccessMsg(null);
    setAmount("");
    setAccountNumber("");
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    try {
      const res = await requestPayout({
        dto: {
          amount: numAmount,
          payoutMethod: method,
          accountDetails: {
            accountNumber: accountNumber.trim(),
            accountType,
            bankName: method === PayoutMethod.BANK_TRANSFER ? bankName.trim() : undefined,
            branchName: method === PayoutMethod.BANK_TRANSFER ? branchName.trim() : undefined,
            accountHolderName: method === PayoutMethod.BANK_TRANSFER ? accountHolderName.trim() : undefined,
          },
        },
        idempotencyKey,
      }).unwrap();

      setSuccessMsg(res.data?.payoutCode ?? "");
      setTimeout(() => {
        onClose();
        reset();
      }, 1800);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, t("submitPayout")));
      setReviewing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{t("payoutModalTitle")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("payout.availableNow")}: <span className="font-semibold text-success">৳{availableBalance.toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-2xl border border-danger bg-danger-soft p-3.5 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-2xl border border-success bg-success-soft p-3.5 text-xs text-success">
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-mono">{successMsg}</span>
          </div>
        )}

        {!reviewing ? (
          <form onSubmit={handleReview} className="mt-5 space-y-5">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("selectMethod")}
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {METHODS.map(({ method: value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    aria-pressed={method === value}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${
                      method === value
                        ? "border-primary bg-primary-soft font-bold text-primary"
                        : "border-border bg-surface-muted text-muted-foreground hover:border-border"
                    }`}
                  >
                    {value === PayoutMethod.BANK_TRANSFER ? (
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="account-num-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("accountNumber")}
              </Label>
              <Input
                id="account-num-input"
                type="text"
                required
                placeholder="017XXXXXXXX"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-1.5"
              />
            </div>

            {method !== PayoutMethod.BANK_TRANSFER && (
              <div className="flex items-center gap-2">
                {(["PERSONAL", "MERCHANT"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccountType(value)}
                    aria-pressed={accountType === value}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      accountType === value
                        ? "border border-success bg-success-soft text-success"
                        : "border border-border bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {value === "PERSONAL" ? "Personal" : "Merchant"}
                  </button>
                ))}
              </div>
            )}

            {method === PayoutMethod.BANK_TRANSFER && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="holder-name-input" className="text-xs text-muted-foreground">{t("payout.accountHolder")}</Label>
                  <Input
                    id="holder-name-input"
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="bank-name-input" className="text-xs text-muted-foreground">Bank</Label>
                    <Input
                      id="bank-name-input"
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-name-input" className="text-xs text-muted-foreground">Branch</Label>
                    <Input
                      id="branch-name-input"
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="payout-amount-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("amount")}
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {isUnderMin ? <span className="font-semibold text-danger">{t("payout.minimum")}</span> : t("payout.minimum")}
                </span>
              </div>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground" aria-hidden="true">৳</span>
                <Input
                  id="payout-amount-input"
                  type="number"
                  min="100"
                  max={availableBalance}
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 text-lg font-bold"
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {[500, 1000, 2000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    disabled={val > availableBalance}
                    className="rounded-xl border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors disabled:opacity-40"
                  >
                    +৳{val.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickAmount(availableBalance)}
                  disabled={availableBalance < 100}
                  className="rounded-xl border border-success bg-success-soft px-2.5 py-1 text-xs font-semibold text-success transition-colors"
                >
                  Max (৳{availableBalance.toLocaleString()})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="w-1/3">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isOverBalance || numAmount < 100} className="w-2/3 gap-2 font-bold">
                <span>{t("payout.reviewTitle")}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <h4 className="text-sm font-bold text-foreground">{t("payout.reviewTitle")}</h4>
            <p className="text-xs text-muted-foreground">{t("payout.reviewMessage")}</p>
            <dl className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.requestedAmount")}</dt>
                <dd className="font-mono font-bold tabular-nums">৳{numAmount.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.method")}</dt>
                <dd className="font-semibold">{method}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.destination")}</dt>
                <dd className="font-mono">{accountNumber.trim()}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">{t("payout.netPayout")}</dt>
                <dd className="font-mono font-bold tabular-nums text-success">৳{numAmount.toLocaleString()}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setReviewing(false)} className="w-1/3">
                {t("cancel")}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isLoading} className="w-2/3 gap-2 font-bold">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{t("submitting")}</span>
                  </>
                ) : (
                  <span>{t("confirm")}</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
