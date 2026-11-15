"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dhruto/ui";
import { AlertTriangle } from "lucide-react";
import { DeliveryFailureReason } from "@dhruto/contracts";

const FAILURE_REASONS = Object.values(DeliveryFailureReason);

interface TaskFailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackingCode: string;
  failReason: DeliveryFailureReason;
  setFailReason: (reason: DeliveryFailureReason) => void;
  failNotes: string;
  setFailNotes: (notes: string) => void;
  rescheduleDate: string;
  setRescheduleDate: (date: string) => void;
  isFailing: boolean;
  onFail: (event: React.FormEvent) => void;
}

export function TaskFailDialog({
  open,
  onOpenChange,
  trackingCode,
  failReason,
  setFailReason,
  failNotes,
  setFailNotes,
  rescheduleDate,
  setRescheduleDate,
  isFailing,
  onFail,
}: TaskFailDialogProps) {
  const t = useTranslations("Rider");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 bg-surface-elevated p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-extrabold text-foreground">
                {t("details.failTitle")}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs font-semibold text-muted-foreground">
                {trackingCode}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={onFail} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="fail-reason" className="text-xs font-semibold text-foreground">
              {t("details.failReason")} *
            </label>
            <Select
              value={failReason}
              onValueChange={(value) => setFailReason(value as DeliveryFailureReason)}
              required
            >
              <SelectTrigger
                id="fail-reason"
                className="w-full h-11 rounded-2xl border-0 bg-surface-muted/60 focus:bg-background"
              >
                <SelectValue placeholder={t("details.failReason")} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-0 bg-surface-elevated shadow-xl">
                {FAILURE_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} className="rounded-xl">
                    {t(`failReasons.${reason}` as "failReasons.CUSTOMER_UNAVAILABLE")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fail-notes" className="text-xs font-semibold text-foreground">
              {t("details.failNotes")}
            </label>
            <Input
              id="fail-notes"
              value={failNotes}
              onChange={(event) => setFailNotes(event.target.value)}
              placeholder={t("details.failNotesPlaceholder")}
              maxLength={500}
              className="h-11 rounded-2xl border-0 bg-surface-muted/60 text-sm focus:bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="reschedule-date"
              className="text-xs font-semibold text-foreground"
            >
              {t("details.rescheduleLabel")}
            </label>
            <Input
              id="reschedule-date"
              type="datetime-local"
              value={rescheduleDate}
              onChange={(event) => setRescheduleDate(event.target.value)}
              className="h-11 rounded-2xl border-0 bg-surface-muted/60 text-sm focus:bg-background"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isFailing}
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isFailing ? t("details.submitting") : t("details.submitFailure")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
