import React from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TrackingQuickSearch } from "@/features/marketing/components/tracking-quick-search";
import { PublicTrackingView } from "@/features/tracking/components/public-tracking-view";

export const metadata = {
  title: "Shipment Tracking — Dhruto Express",
  description: "View real-time delivery milestones and location of your parcel.",
};

export default async function TrackCodePage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>;
}) {
  const { code } = await params;
  const t = await getTranslations("Tracking");

  return (
    <div className="min-h-screen bg-background">
      {/* Streamlined High-Tech Telemetry Command Bar */}
      <div className="track-command-header">
        <div className="dhruto-container max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Back Link & Active Waybill ID */}
            <div className="space-y-1.5">
              <Link
                href="/track"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                {t("backToSearch")}
              </Link>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <h1 className="font-mono text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  {code}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                  <Radio className="h-3 w-3 animate-pulse" />
                  {t("liveTelemetry")}
                </span>
              </div>
            </div>

            {/* Right: Compact inline search for switching codes */}
            <div className="w-full md:w-80">
              <TrackingQuickSearch />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tracking Results Cockpit */}
      <main className="py-6">
        <PublicTrackingView initialCode={code} showIntro={false} />
      </main>
    </div>
  );
}
