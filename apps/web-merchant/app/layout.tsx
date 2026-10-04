import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";

export const metadata: Metadata = {
  title: "Dhruto — Merchant Portal",
  description: "Enterprise Logistics Management System for Bangladesh",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
        <Providers>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
