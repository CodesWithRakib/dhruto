"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

type Connectivity = "online" | "offline" | "reconnecting";

/**
 * Honest connectivity indicator for the whole app.
 *
 * Shows a single, unobtrusive banner only when the browser is offline (or
 * briefly reconnecting). It never blocks interaction and does not imply any
 * offline business capability the backend does not provide.
 */
export function NetworkStatus() {
  const t = useTranslations("Pwa");
  const [status, setStatus] = React.useState<Connectivity>("online");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
    }

    const handleOffline = () => setStatus("offline");
    const handleOnline = () => {
      setStatus("reconnecting");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("online"), 1500);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (status === "online") return null;

  const isOffline = status === "offline";
  const message = isOffline ? t("offline") : t("reconnecting");

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe print:hidden"
    >
      <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-warning-soft px-3 py-1.5 text-caption font-medium text-warning-soft-foreground">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}
