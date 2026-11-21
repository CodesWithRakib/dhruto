"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { PayoutMethod } from "@dhruto/contracts";
import { useRequestPayoutMutation, newIdempotencyKey } from "../api/finance.api";
import {
  X,
  CheckCircle,
  AlertCircle,
  Building2,
  Smartphone,
  ArrowRight,
  Loader2,
  BookmarkCheck,
  RotateCcw,
} from "lucide-react";
import { Button, Input, Label } from "@dhruto/ui";
import { getApiErrorMessage } from "@/lib/api-error";
import { useFormatters } from "@/lib/format";

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

const PRESET_STORAGE_KEY = "dhruto:last_payout_account";

/**
 * Payout request with an explicit review step. The submission carries an
 * idempotency key generated once per modal session, so double-clicks and
 * retries replay instead of double-spending.
 */
export function PayoutRequestModal({ isOpen, onClose, availableBalance }: PayoutRequestModalProps) {
  const t = useTranslations("Finance");
  const { bdt } = useFormatters();
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
  const [hasLoadedPreset, setHasLoadedPreset] = React.useState(false);
  const idempotencyKey = React.useMemo(() => newIdempotencyKey(), []);

  const [requestPayout, { isLoading }] = useRequestPayoutMutation();

  // Load saved payout account preset on open
  React.useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.method && Object.values(PayoutMethod).includes(parsed.method)) {
          setMethod(parsed.method);
        }
        if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
        if (parsed.accountType) setAccountType(parsed.accountType);
        if (parsed.bankName) setBankName(parsed.bankName);
        if (parsed.branchName) setBranchName(parsed.branchName);
        if (parsed.accountHolderName) setAccountHolderName(parsed.accountHolderName);
        setHasLoadedPreset(true);
      }
    } catch {
      // Ignore local storage errors
    }
  }, [isOpen]);

  const clearPreset = () => {
    try {
      localStorage.removeItem(PRESET_STORAGE_KEY);
      setAccountNumber("");
      setBankName("");
      setBranchName("");
      setAccountHolderName("");
      setHasLoadedPreset(false);
    } catch {
      // Ignore local storage errors
    }
  };

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isOverBalance = numAmount > availableBalance;
  // Explain why "Review" is disabled instead of silently greying it out.
  const amountError =
    amount.trim() === ""
      ? null
      : isOverBalance
        ? t("amountOverBalance", { amount: bdt(availableBalance) })
        : numAmount < 100
          ? t("amountBelowMinimum", { amount: bdt(100) })
          : null;
  const isUnderMin = numAmount < 100 && numAmount > 0;

  const handleQuickAmount = (val: number) => {
    setAmount(Math.min(val, availableBalance).toString());
  };

  const handlePercentage = (pct: number) => {
    if (availableBalance <= 0) return;
    const calc = Math.floor(availableBalance * pct);
    setAmount(Math.max(0, calc).toString());
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
            accountHolderName:
              method === PayoutMethod.BANK_TRANSFER ? accountHolderName.trim() : undefined,
          },
        },
        idempotencyKey,
      }).unwrap();

      // Persist account details for subsequent 1-click payouts
      try {
        localStorage.setItem(
          PRESET_STORAGE_KEY,
          JSON.stringify({
            method,
            accountNumber: accountNumber.trim(),
            accountType,
            bankName: bankName.trim(),
            branchName: branchName.trim(),
            accountHolderName: accountHolderName.trim(),
          }),
        );
      } catch {
        // Ignore local storage errors
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-elevated p-6 sm:p-8 border border-border/40 shadow-xs">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {t("payoutModalTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("payout.availableNow")}:{" "}
              <span className="font-semibold text-success">{bdt(availableBalance)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {hasLoadedPreset && !reviewing && (
          <div className="flex items-center justify-between rounded-xl bg-primary-soft/40 px-3 py-2 text-xs text-primary border border-primary/20">
            <div className="flex items-center gap-1.5 font-medium">
              <BookmarkCheck className="h-3.5 w-3.5" />
              <span>Loaded saved account details</span>
            </div>
            <button
              type="button"
              onClick={clearPreset}
              className="flex items-center gap-1 text-[11px] underline hover:opacity-80"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-xl bg-danger-soft p-3.5 text-xs text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-xl bg-success-soft p-3.5 text-xs text-success"
          >
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-mono">{successMsg}</span>
          </div>
        )}

        {!reviewing ? (
          <form onSubmit={handleReview} className="mt-4 space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("selectMethod")}
              </Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {METHODS.map(({ method: value, label }) => {
                  const isSelected = method === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value)}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                      }`}
                    >
                      {value === PayoutMethod.BANK_TRANSFER ? (
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Smartphone className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span className="text-xs">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label
                htmlFor="account-num-input"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("accountNumber")}
              </Label>
              <Input
                id="account-num-input"
                type="text"
                required
                placeholder="017XXXXXXXX"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-1 bg-surface-muted/60 focus-visible:ring-1"
              />
            </div>

            {method !== PayoutMethod.BANK_TRANSFER && (
              <div className="flex items-center gap-2">
                {(["PERSONAL", "MERCHANT"] as const).map((value) => {
                  const isCurrent = accountType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccountType(value)}
                      aria-pressed={isCurrent}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                        isCurrent
                          ? "bg-success-soft text-success"
                          : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted"
                      }`}
                    >
                      {value === "PERSONAL" ? t("personal") : t("merchant")}
                    </button>
                  );
                })}
              </div>
            )}

            {method === PayoutMethod.BANK_TRANSFER && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="holder-name-input" className="text-xs text-muted-foreground">
                    {t("payout.accountHolder")}
                  </Label>
                  <Input
                    id="holder-name-input"
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="mt-1 text-xs bg-surface-muted/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="bank-name-input" className="text-xs text-muted-foreground">
                      {t("bank")}
                    </Label>
                    <Input
                      id="bank-name-input"
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1 text-xs bg-surface-muted/60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch-name-input" className="text-xs text-muted-foreground">
                      {t("branch")}
                    </Label>
                    <Input
                      id="branch-name-input"
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="mt-1 text-xs bg-surface-muted/60"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="payout-amount-input"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t("amount")}
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {isUnderMin ? (
                    <span className="font-semibold text-danger">{t("payout.minimum")}</span>
                  ) : (
                    t("payout.minimum")
                  )}
                </span>
              </div>
              <div className="relative mt-1">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground"
                  aria-hidden="true"
                >
                  ৳
                </span>
                <Input
                  id="payout-amount-input"
                  type="number"
                  min="100"
                  max={availableBalance}
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={amountError ? true : undefined}
                  aria-describedby={amountError ? "payout-amount-error" : undefined}
                  className="pl-9 text-lg font-bold"
                />
              </div>
              {amountError ? (
                <p id="payout-amount-error" role="alert" className="mt-1 text-xs font-medium text-danger">
                  {amountError}
                </p>
              ) : null}

              {/* Percentage Quick Pick */}
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1">Quick %:</span>
                {[0.25, 0.5, 0.75, 1.0].map((pct) => {
                  const label = pct === 1.0 ? "100% (All)" : `${pct * 100}%`;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentage(pct)}
                      disabled={availableBalance < 100}
                      className="rounded-lg bg-surface-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Nominal Quick Pick */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1">Fixed:</span>
                {[500, 1000, 2000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    disabled={val > availableBalance}
                    className="rounded-lg bg-surface-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
                  >
                    {bdt(val)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="w-1/3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted">
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isOverBalance || numAmount < 100}
                className="w-2/3 gap-2 rounded-xl font-bold"
              >
                <span>{t("payout.reviewTitle")}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <h4 className="text-sm font-bold text-foreground">{t("payout.reviewTitle")}</h4>
            <p className="text-xs text-muted-foreground">{t("payout.reviewMessage")}</p>
            <dl className="space-y-2 rounded-xl bg-surface-muted/70 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.requestedAmount")}</dt>
                <dd className="font-mono font-bold tabular-nums">{bdt(numAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.method")}</dt>
                <dd className="font-semibold">{method}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("payout.destination")}</dt>
                <dd className="font-mono">{accountNumber.trim()}</dd>
              </div>
              {method === PayoutMethod.BANK_TRANSFER && bankName && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Bank & Branch</dt>
                  <dd className="font-medium">{bankName} {branchName ? `(${branchName})` : ""}</dd>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border/40">
                <dt className="text-muted-foreground">{t("payout.netPayout")}</dt>
                <dd className="font-mono font-bold tabular-nums text-success">{bdt(numAmount)}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewing(false)}
                className="w-1/3 rounded-xl bg-surface-muted/60 hover:bg-surface-muted"
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-2/3 gap-2 rounded-xl font-bold"
              >
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
