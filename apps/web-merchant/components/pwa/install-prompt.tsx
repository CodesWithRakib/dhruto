"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";
import { Button } from "@dhruto/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dhruto_install_dismissed_at";
const DISMISS_DAYS = 30;
const DELAY_MS = 20_000;

/**
 * Reusable PWA install prompt.
 *
 * Non-aggressive by design: it only appears on mobile browsers that support
 * installation, after a delay, and never again for 30 days once dismissed.
 * Nothing is shown where the app is already installed (standalone display).
 */
export function InstallPrompt() {
  const t = useTranslations("Pwa");
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed? Nothing to prompt.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Recently dismissed?
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), DELAY_MS);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable (private mode) — dismiss for this session only.
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!visible || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label={t("installTitle")}
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe lg:hidden print:hidden"
    >
      <div className="mx-auto mb-4 flex max-w-md items-start gap-3 rounded-xl border border-border bg-surface p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
          <Download className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-foreground">{t("installTitle")}</p>
          <p className="mt-0.5 text-caption text-muted-foreground">{t("installDescription")}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={install}>
              {t("install")}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {t("later")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
