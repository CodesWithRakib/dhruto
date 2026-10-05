"use client";

import * as React from "react";
import { usePathname } from "@/lib/navigation";
import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";
import { DashboardShell } from "./dashboard-shell";

/** Routes that render inside the authenticated, navigable dashboard shell. */
const DASHBOARD_PREFIXES = [
  "/dashboard",
  "/parcels",
  "/bookings",
  "/finance",
  "/hub",
  "/rider",
  "/intelligence",
  "/developer",
];

/** Distraction-free authentication surfaces (no public nav, no footer). */
const AUTH_ROUTES = ["/login", "/register"];

type Surface = "public" | "auth" | "dashboard";

function resolveSurface(pathname: string): Surface {
  const clean = pathname.replace(/^\/(en|bn)/, "") || "/";

  if (AUTH_ROUTES.some((route) => clean === route || clean.startsWith(`${route}/`))) {
    return "auth";
  }
  if (DASHBOARD_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`))) {
    return "dashboard";
  }
  return "public";
}

/**
 * Single place that decides which chrome wraps a route, so public pages,
 * auth screens and dashboards never double-render headers or footers.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const surface = resolveSurface(pathname);

  if (surface === "auth") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-10">
          {children}
        </main>
      </div>
    );
  }

  if (surface === "dashboard") {
    return <DashboardShell>{children}</DashboardShell>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
    </div>
  );
}
