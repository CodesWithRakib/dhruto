"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from "@dhruto/ui";
import {
  PackagePlus,
  PackageSearch,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { useGetMerchantDashboardQuery } from "../../merchants/api/merchants.api";
import { useAppSelector } from "../../../store/hooks";

export function MerchantDashboard() {
  const t = useTranslations("Index");
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetMerchantDashboardQuery();

  const stats = data?.data?.stats || {
    totalOrders: 0,
    pendingOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    returnedOrders: 0,
    totalCodAmount: 0,
    collectedCodAmount: 0,
  };

  const recentParcels = data?.data?.recentParcels || [];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {user ? `${user.name} — ${t("dashboardTitle")}` : t("dashboardTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("dashboardSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/track">
            <Button variant="outline" className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4" />
              {t("trackParcel")}
            </Button>
          </Link>
          <Link href="/bookings/new">
            <Button className="flex items-center gap-2">
              <PackagePlus className="h-4 w-4" />
              {t("bookNew")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Shipments */}
        <Card className="border-primary/20 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-semibold">
                {t("kpiTotal")}
              </CardDescription>
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {isLoading ? "..." : stats.totalOrders}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Pending Pickup */}
        <Card className="border-amber-500/20 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-semibold">
                {t("kpiPending")}
              </CardDescription>
              <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {isLoading ? "..." : stats.pendingOrders}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* In Transit */}
        <Card className="border-blue-500/20 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-semibold">
                {t("kpiInTransit")}
              </CardDescription>
              <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {isLoading ? "..." : stats.inTransitOrders}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Delivered */}
        <Card className="border-emerald-500/20 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-semibold">
                {t("kpiDelivered")}
              </CardDescription>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {isLoading ? "..." : stats.deliveredOrders}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Collected COD */}
        <Card className="border-indigo-500/20 bg-card col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase font-semibold">
                {t("kpiCod")}
              </CardDescription>
              <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              ৳{isLoading ? "..." : stats.collectedCodAmount.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Shipments Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-bold">{t("recentOrders")}</CardTitle>
            <CardDescription>Live pipeline of your most recent bookings.</CardDescription>
          </div>
          <Link href="/parcels">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              {t("viewAll")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Loading recent shipments...
            </div>
          ) : recentParcels.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="p-3 bg-muted w-fit rounded-full mx-auto text-muted-foreground">
                <RotateCcw className="h-6 w-6" />
              </div>
              <p className="text-muted-foreground font-medium text-sm">
                No shipments recorded yet. Create your first parcel booking to begin shipping.
              </p>
              <Link href="/bookings/new">
                <Button size="sm" className="mt-2">
                  <PackagePlus className="h-4 w-4 mr-2" />
                  {t("bookNew")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tracking ID</th>
                    <th className="px-4 py-3 font-semibold">Recipient</th>
                    <th className="px-4 py-3 font-semibold">Destination</th>
                    <th className="px-4 py-3 font-semibold">COD Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentParcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        <Link
                          href={`/parcels/${parcel.id}`}
                          className="hover:underline text-primary"
                        >
                          {parcel.trackingCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {parcel.recipientName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {parcel.recipientPhone}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {parcel.district}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        ৳{parcel.codAmount}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            parcel.status === "DELIVERED"
                              ? "success"
                              : parcel.status === "CREATED"
                                ? "outline"
                                : "default"
                          }
                          className="text-xs"
                        >
                          {parcel.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/parcels/${parcel.id}/label`}>
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              Label
                            </Button>
                          </Link>
                          <Link href={`/parcels/${parcel.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
