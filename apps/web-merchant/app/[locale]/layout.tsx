import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali, Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../src/i18n/routing";
import "../globals.css";
import { Providers } from "./providers";
import { NetworkStatus } from "@/components/pwa/network-status";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";

/** Latin font stack matching Gramer Bazar. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Bangla font stack matching Gramer Bazar: Hind Siliguri + Noto Sans Bengali. */
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://dhruto.com"),
  title: {
    default: "Dhruto — Smarter Delivery Infrastructure for Bangladesh",
    template: "%s | Dhruto",
  },
  description:
    "Dhruto is Bangladesh's logistics operating system: nationwide parcel delivery, cash-on-delivery collection, merchant automation and real-time tracking.",
  applicationName: "Dhruto",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Dhruto",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: true },
  keywords: [
    "Dhruto",
    "courier service Bangladesh",
    "parcel delivery",
    "cash on delivery",
    "logistics platform",
    "merchant shipping",
  ],
  openGraph: {
    type: "website",
    siteName: "Dhruto",
    title: "Dhruto — Smarter Delivery Infrastructure for Bangladesh",
    description:
      "Nationwide parcel delivery, COD collection, merchant automation and real-time tracking.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16A34A",
};

/**
 * Locale root. Owns `<html>`/`<body>`, fonts, i18n and the Redux store.
 *
 * Chrome (public header/footer, auth shell, dashboard shell) is provided by
 * the per-surface group layouts, so this file stays free of pathname logic.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "bn")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} ${hindSiliguri.variable} ${notoSansBengali.variable}`}
    >
      <body
        className={`min-h-screen bg-background ${locale === "bn" ? "font-bangla" : "font-sans"} text-foreground antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <NetworkStatus />
            {children}
            <InstallPrompt />
            <ServiceWorkerRegister />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
