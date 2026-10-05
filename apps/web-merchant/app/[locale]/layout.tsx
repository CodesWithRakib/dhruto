import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../src/i18n/routing";
import "../globals.css";
import { Providers } from "./providers";
import { AppShell } from "../../components/layout/app-shell";

/** Latin face — variable font, used for all English copy. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Bangla face — explicit weights keep glyph rendering crisp in Bangla. */
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
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
  themeColor: "#16A34A",
};

export default async function RootLayout({
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
      className={`${inter.variable} ${notoSansBengali.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
