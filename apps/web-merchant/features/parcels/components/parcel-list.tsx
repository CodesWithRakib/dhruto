"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useParcelsList } from "../hooks/use-parcels-list";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
} from "@dhruto/ui";
import { PackageSearch, Plus, MapPin, Phone, Hash, Search, Printer, Eye } from "lucide-react";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { StatusBadge } from "@/components/data-display/status-badge";

const STATUS_FILTERS = [
  { value: "", labelKey: "all" },
  { value: "CREATED", labelKey: "filterCreated" },
  { value: "IN_TRANSIT", labelKey: "filterInTransit" },
  { value: "OUT_FOR_DELIVERY", labelKey: "filterOutForDelivery" },
  { value: "DELIVERED", labelKey: "filterDelivered" },
  { value: "RETURNED_TO_MERCHANT", labelKey: "filterReturned" },
] as const;

export function ParcelList() {
  const t = useTranslations("ParcelList");
  const routes = useRouteBase();
  const { parcels, isLoading, status, setStatus, search, setSearch } = useParcelsList();

  const createHref = routes.createBooking;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-border sm:flex-row sm:items-center">
        <div>
          <CardTitle className="flex items-center gap-2 text-h3 text-foreground">
            <PackageSearch className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("title")}
          </CardTitle>
          <CardDescription className="mt-1 text-muted-foreground">
            {t("description")}
          </CardDescription>
        </div>
        {createHref ? (
          <Link href={createHref}>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("create")}
            </Button>
          </Link>
        ) : null}
      </CardHeader>

      {/* Filter toolbar: inline on desktop, full-width on mobile. */}
      <div className="flex flex-col items-stretch gap-3 border-b border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-body-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="parcel-status-filter" className="text-caption font-medium text-muted-foreground">
            {t("status")}
          </label>
          <select
            id="parcel-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 p-10 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-body-sm">{t("loading")}</p>
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && parcels.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <PackageSearch className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-h4 text-foreground">{t("empty")}</p>
          {createHref ? (
            <Link href={createHref}>
              <Button variant="outline" className="mt-1">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("create")}
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}

      {!isLoading && parcels.length > 0 ? (
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-table">
              <thead className="border-b border-border bg-surface-muted text-caption uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-semibold">{t("tracking")}</th>
                  <th className="px-6 py-3 font-semibold">{t("recipient")}</th>
                  <th className="px-6 py-3 font-semibold">{t("address")}</th>
                  <th className="px-6 py-3 font-semibold">{t("cod")}</th>
                  <th className="px-6 py-3 font-semibold">{t("status")}</th>
                  <th className="px-6 py-3 font-semibold">{t("date")}</th>
                  <th className="px-6 py-3 text-right font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parcels.map((parcel) => (
                  <tr key={parcel.id} className="transition-colors hover:bg-surface-muted">
                    <td className="px-6 py-4">
                      <Link
                        href={routes.parcel(parcel.id)}
                        className="flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline"
                      >
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {parcel.trackingCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{parcel.recipientName}</p>
                      <p className="mt-1 flex items-center gap-1 font-mono text-caption text-muted-foreground">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {parcel.recipientPhone}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">
                        {parcel.thana}, {parcel.district}
                      </p>
                      <p className="mt-1 flex items-start gap-1 text-caption text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="max-w-[200px] truncate" title={parcel.deliveryAddress}>
                          {parcel.deliveryAddress}
                        </span>
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold tabular-nums text-foreground">
                        ৳{parcel.codAmount}
                      </p>
                      <p className="mt-1 text-caption text-muted-foreground">
                        {t("fee")} ৳{parcel.deliveryFee}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={parcel.status} />
                    </td>
                    <td className="px-6 py-4 text-caption text-muted-foreground">
                      {new Date(parcel.createdAt).toLocaleDateString()}
                      <br />
                      {new Date(parcel.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={routes.parcelLabel(parcel.id)}
                          aria-label={t("printLabel")}
                          title={t("printLabel")}
                        >
                          <Button variant="ghost" size="icon-sm">
                            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </Link>
                        <Link href={routes.parcel(parcel.id)}>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("view")}
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — same information, no horizontal scroll. */}
          <ul className="divide-y divide-border md:hidden">
            {parcels.map((parcel) => (
              <li key={parcel.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={routes.parcel(parcel.id)}
                    className="font-mono text-body font-semibold text-primary hover:underline"
                  >
                    {parcel.trackingCode}
                  </Link>
                  <StatusBadge status={parcel.status} />
                </div>
                <div className="space-y-1 text-body-sm">
                  <p className="font-medium text-foreground">{parcel.recipientName}</p>
                  <p className="flex items-center gap-1.5 font-mono text-caption text-muted-foreground">
                    <Phone className="h-3 w-3" aria-hidden="true" />
                    {parcel.recipientPhone}
                  </p>
                  <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {parcel.thana}, {parcel.district}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold tabular-nums text-foreground">
                    ৳{parcel.codAmount}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={routes.parcelLabel(parcel.id)}
                      aria-label={t("printLabel")}
                      title={t("printLabel")}
                    >
                      <Button variant="ghost" size="icon-sm">
                        <Printer className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Link href={routes.parcel(parcel.id)}>
                      <Button variant="outline" size="sm">
                        {t("view")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
