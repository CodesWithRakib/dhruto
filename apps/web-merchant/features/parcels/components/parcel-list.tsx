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
import { ParcelStatus } from "@dhruto/contracts";

function getStatusColor(status: ParcelStatus) {
  switch (status) {
    case ParcelStatus.CREATED:
    case ParcelStatus.PICKUP_REQUESTED:
    case ParcelStatus.PICKUP_ASSIGNED:
      return "bg-slate-100 text-slate-800 border-slate-300";
    case ParcelStatus.PICKED_UP:
    case ParcelStatus.ORIGIN_HUB_RECEIVED:
    case ParcelStatus.BAGGED:
    case ParcelStatus.IN_TRANSIT:
    case ParcelStatus.DESTINATION_HUB_RECEIVED:
    case ParcelStatus.ASSIGNED_TO_RIDER:
    case ParcelStatus.OUT_FOR_DELIVERY:
      return "bg-blue-100 text-blue-800 border-blue-300";
    case ParcelStatus.DELIVERED:
    case ParcelStatus.CASH_PENDING:
    case ParcelStatus.CASH_VERIFIED:
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case ParcelStatus.DELIVERY_ATTEMPTED:
    case ParcelStatus.RESCHEDULED:
      return "bg-amber-100 text-amber-800 border-amber-300";
    case ParcelStatus.CANCELLED:
    case ParcelStatus.LOST:
    case ParcelStatus.DAMAGED:
    case ParcelStatus.RTO_INITIATED:
    case ParcelStatus.RETURN_IN_TRANSIT:
    case ParcelStatus.RETURNED_TO_MERCHANT:
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
}

export function ParcelList() {
  const t = useTranslations("ParcelList");
  const { parcels, isLoading, status, setStatus, search, setSearch } = useParcelsList();

  return (
    <Card className="w-full border-primary/20 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 border-b border-primary/10 rounded-t-xl">
        <div>
          <CardTitle className="text-xl text-foreground flex items-center gap-2">
            <PackageSearch className="h-6 w-6 text-primary" />
            {t("title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            {t("description")}
          </CardDescription>
        </div>
        <Link href="/bookings/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("create")}
          </Button>
        </Link>
      </CardHeader>

      {/* Filters Toolbar */}
      <div className="p-4 border-b bg-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">Filter:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs rounded-md border border-input bg-background px-3 py-1.5 h-9 focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="">{t("all")}</option>
            <option value="CREATED">CREATED</option>
            <option value="IN_TRANSIT">IN TRANSIT</option>
            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="RETURNED_TO_MERCHANT">RETURNED</option>
          </select>
        </div>
      </div>

      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[800px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">{t("tracking")}</th>
                <th className="px-6 py-4 font-semibold">{t("recipient")}</th>
                <th className="px-6 py-4 font-semibold">{t("address")}</th>
                <th className="px-6 py-4 font-semibold">{t("cod")}</th>
                <th className="px-6 py-4 font-semibold">{t("status")}</th>
                <th className="px-6 py-4 font-semibold">{t("date")}</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p>{t("loading")}</p>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && parcels.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <PackageSearch className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-lg font-medium">{t("empty")}</p>
                      <Link href="/bookings/new">
                        <Button variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          {t("create")}
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                parcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/parcels/${parcel.id}`}
                        className="flex items-center gap-1.5 font-mono font-bold text-primary hover:underline"
                      >
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{parcel.trackingCode}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{parcel.recipientName}</p>
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                        <Phone className="h-3 w-3" />
                        <span className="font-mono">{parcel.recipientPhone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">
                        {parcel.thana}, {parcel.district}
                      </p>
                      <div className="flex items-start gap-1 mt-1 text-muted-foreground text-xs max-w-[200px] truncate">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="truncate" title={parcel.deliveryAddress}>
                          {parcel.deliveryAddress}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">৳{parcel.codAmount}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Fee: ৳{parcel.deliveryFee}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusColor(
                          parcel.status as any,
                        )}`}
                      >
                        {parcel.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(parcel.createdAt).toLocaleDateString()}
                      <br />
                      {new Date(parcel.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/parcels/${parcel.id}/label`} title="Print Shipping Label">
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Printer className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </Link>
                        <Link href={`/parcels/${parcel.id}`} title="View Details">
                          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
