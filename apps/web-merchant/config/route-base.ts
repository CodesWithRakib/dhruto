"use client";

import { usePathname } from "@/lib/navigation";
import { ADMIN_ROUTES, MERCHANT_ROUTES, stripLocale } from "./routes";

/**
 * Dhruto — role-aware link base.
 * ------------------------------------------------------------------
 * Shared feature components (parcel list, parcel details, shipping label)
 * render under more than one role namespace. Instead of hard-coding
 * `/parcels/...`, they resolve links through this base so an admin viewing
 * `/admin/parcels` stays inside the admin namespace.
 */
export interface RouteBase {
  namespace: "merchant" | "admin";
  parcels: string;
  parcel: (id: string) => string;
  parcelLabel: (id: string) => string;
  /** Omitted when the role cannot create bookings from this surface. */
  createBooking?: string;
}

export const MERCHANT_ROUTE_BASE: RouteBase = {
  namespace: "merchant",
  parcels: MERCHANT_ROUTES.parcels,
  parcel: MERCHANT_ROUTES.parcel,
  parcelLabel: MERCHANT_ROUTES.parcelLabel,
  createBooking: MERCHANT_ROUTES.createBooking,
};

export const ADMIN_ROUTE_BASE: RouteBase = {
  namespace: "admin",
  parcels: ADMIN_ROUTES.parcels,
  parcel: ADMIN_ROUTES.parcel,
  parcelLabel: ADMIN_ROUTES.parcelLabel,
};

/** Resolves the active link base from the current pathname. */
export function useRouteBase(): RouteBase {
  const pathname = usePathname();
  return stripLocale(pathname).startsWith("/admin") ? ADMIN_ROUTE_BASE : MERCHANT_ROUTE_BASE;
}
