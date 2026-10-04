"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import { Package, PlusCircle, LayoutDashboard, Truck, Search, Warehouse, Bike } from "lucide-react";
import { Button, LanguageSwitcher } from "@dhruto/ui";
import { useLocale } from "next-intl";
import { AuthNav } from "./auth-nav";

export function Navbar() {
  const locale = useLocale();

  return (
    <header className="border-b bg-card sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-2 text-primary font-bold text-xl tracking-tight"
          >
            <div className="p-1.5 bg-primary text-primary-foreground rounded-lg">
              <Truck className="h-5 w-5" />
            </div>
            <span>Dhruto</span>
            <span className="text-xs font-normal text-muted-foreground border px-1.5 py-0.5 rounded">
              Merchant
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </Link>
            <Link
              href="/parcels"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Package className="h-4 w-4" />
              My Parcels
            </Link>
            <Link
              href="/hub"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Warehouse className="h-4 w-4" />
              Hub Operations
            </Link>
            <Link
              href="/rider"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Bike className="h-4 w-4" />
              Rider Terminal
            </Link>
            <Link
              href="/track"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Search className="h-4 w-4" />
              Tracking
            </Link>
            <Link
              href="/bookings/new"
              className="text-primary font-semibold flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              New Booking
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <LanguageSwitcher currentLocale={locale} />
          <AuthNav />
          <Link href="/bookings/new" className="hidden sm:inline-block">
            <Button size="sm" className="flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              Book Parcel
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
