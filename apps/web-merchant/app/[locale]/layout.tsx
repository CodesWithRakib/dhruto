import React from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../src/i18n/routing';
import { ThemePaletteProvider } from '@dhruto/ui';
import "../globals.css";
import { Providers } from "./providers";
import { Navbar } from "../../components/navbar";
import { Footer } from "../../components/footer";

export const metadata: Metadata = {
  title: "Dhruto — Merchant Portal",
  description: "Enterprise Logistics Management System for Bangladesh",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "bn")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground">
        <NextIntlClientProvider messages={messages}>
          <ThemePaletteProvider>
            <Providers>
              <Navbar />
              <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
              <Footer />
            </Providers>
          </ThemePaletteProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
