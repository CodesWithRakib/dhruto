import React from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicMobileBottomNav } from "@/components/layout/public-mobile-bottom-nav";
import { ScrollProgress } from "@/components/layout/scroll-progress";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import "@/features/marketing/styles/marketing.css";
import "@/features/tracking/styles/tracking.css";
import "@/features/about/styles/about.css";
import "@/features/services/styles/services.css";
import "@/features/pricing/styles/pricing.css";
import "@/features/contact/styles/contact.css";
import "@/features/privacy/styles/privacy.css";

/**
 * Public surface: marketing pages and public tracking.
 * Owns the public chrome so individual pages never repeat it.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background pb-20 md:pb-0 selection:bg-primary-soft selection:text-primary-soft-foreground">
      <ScrollProgress />
      <AnnouncementBar />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
      <PublicMobileBottomNav />
    </div>
  );
}

