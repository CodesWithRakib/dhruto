import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/navigation";
import { Button } from "@dhruto/ui";
import { OfflineState } from "@/components/feedback/states";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback served by the service worker when a navigation cannot be
 * fulfilled from the network. Deliberately chrome-free and honest: it does not
 * pretend the app works offline.
 */
export default async function OfflinePage() {
  const t = await getTranslations("Offline");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <OfflineState
          title={t("title")}
          description={t("description")}
          action={
            <Link href="/">
              <Button variant="outline" size="sm">
                {t("goHome")}
              </Button>
            </Link>
          }
        />
      </div>
    </main>
  );
}
