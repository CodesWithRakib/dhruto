"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, Smartphone } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@dhruto/ui";

interface TestSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  testPhone: string;
  setTestPhone: (v: string) => void;
  testMessage: string;
  setTestMessage: (v: string) => void;
  isTestingSms: boolean;
}

export function TestSmsDialog({
  open,
  onOpenChange,
  onSubmit,
  testPhone,
  setTestPhone,
  testMessage,
  setTestMessage,
  isTestingSms,
}: TestSmsDialogProps) {
  const t = useTranslations("AdminIntegrations");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl bg-surface-elevated p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("testSmsTitle")}
          </DialogTitle>
          <DialogDescription>{t("testSmsDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="test-phone">{t("testPhoneLabel")}</Label>
            <Input
              id="test-phone"
              type="tel"
              placeholder={t("testPhonePlaceholder")}
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-message">{t("testMessageLabel")}</Label>
            <Textarea
              id="test-message"
              rows={3}
              placeholder={t("testMessagePlaceholder")}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isTestingSms}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isTestingSms || !testPhone.trim() || !testMessage.trim()}
              className="gap-2"
            >
              {isTestingSms ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isTestingSms ? t("testSending") : t("testSendBtn")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
