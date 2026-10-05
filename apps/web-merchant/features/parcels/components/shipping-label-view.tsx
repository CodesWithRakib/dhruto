"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, CardTitle, CardDescription } from "@dhruto/ui";
import { Printer, ArrowLeft, AlertCircle, Truck } from "lucide-react";
import { useGetShippingLabelQuery } from "../api/parcels.api";
import { useRouteBase } from "@/config/route-base";

interface ShippingLabelViewProps {
  parcelId: string;
}

export function ShippingLabelView({ parcelId }: ShippingLabelViewProps) {
  const t = useTranslations("ShippingLabel");
  const routes = useRouteBase();
  const { data, isLoading, error } = useGetShippingLabelQuery(parcelId);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Generating shipping label...</p>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <Card className="max-w-md mx-auto my-8 border-destructive/20 text-center p-8">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
        <CardTitle className="text-lg">Label Generation Failed</CardTitle>
        <CardDescription>Could not retrieve label for shipment "{parcelId}".</CardDescription>
        <Link href={routes.parcels} className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t("back")}
          </Button>
        </Link>
      </Card>
    );
  }

  const label = data.data;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Screen Control Bar */}
      <div className="flex items-center justify-between print:hidden">
        <Link href={routes.parcel(parcelId)}>
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          {t("print")}
        </Button>
      </div>

      {/* 4x6 Physical Thermal Label Container */}
      {/* Physical 4x6 thermal label: black-on-white is intentional (print artifact). */}
      <div className="mx-auto max-w-[420px] rounded-lg border-2 border-black bg-white p-6 font-sans text-black print:max-w-full print:border-none print:p-0">
        {/* Label Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-black text-white rounded">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black tracking-tighter">DHRUTO</span>
            <span className="text-[10px] font-bold border border-black px-1 rounded ml-1">
              EXPRESS
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold block text-neutral-600">
              {t("hub")}
            </span>
            <span className="text-sm font-black">{label.routingHub}</span>
          </div>
        </div>

        {/* Barcode & Tracking Section */}
        <div className="py-4 border-b-2 border-black text-center space-y-1">
          <div
            className="w-full flex justify-center [&>svg]:max-h-16 [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: label.barcodeSvg }}
          />
        </div>

        {/* Grid Info: Recipient & COD */}
        <div className="grid grid-cols-3 border-b-2 border-black divide-x-2 divide-black">
          {/* Recipient Details (2 cols) */}
          <div className="col-span-2 p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-neutral-600 block">
              {t("to")}
            </span>
            <p className="text-sm font-black uppercase leading-tight">{label.recipientName}</p>
            <p className="text-sm font-bold font-mono tracking-tight">{label.recipientPhone}</p>
            <p className="text-xs leading-tight text-neutral-800 mt-1">
              {label.deliveryAddress}
            </p>
            <p className="text-xs font-black uppercase mt-1">
              {label.thana}, {label.district}
            </p>
          </div>

          {/* COD Box (1 col) */}
          <div className="p-3 bg-neutral-100 flex flex-col justify-center items-center text-center">
            <span className="text-[9px] font-black uppercase text-neutral-700">
              {t("codAmount")}
            </span>
            <span className="text-lg font-black mt-1 leading-none">
              ৳{label.codAmount.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-neutral-500 mt-1">
              {label.codAmount > 0 ? "COLLECT CASH" : "PREPAID"}
            </span>
          </div>
        </div>

        {/* Sender & Spec Details */}
        <div className="p-3 border-b-2 border-black space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-neutral-600 block">
            {t("from")}
          </span>
          <div className="flex justify-between items-start text-xs">
            <div>
              <p className="font-bold">{label.merchantName}</p>
              <p className="font-mono text-[11px] text-neutral-700">{label.merchantPhone}</p>
              <p className="text-[11px] text-neutral-600 truncate max-w-[260px]">
                {label.pickupAddress}
              </p>
            </div>
            <div className="text-right pl-2">
              <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                {t("zone")}
              </span>
              <span className="text-xs font-black uppercase">{label.zone}</span>
            </div>
          </div>
        </div>

        {/* Footer Specs */}
        <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-neutral-600">
          <span>WEIGHT: {label.weightKg} KG</span>
          <span>DATE: {new Date(label.createdDate).toLocaleDateString()}</span>
          <span>DHRUTO LOGISTICS BD</span>
        </div>
      </div>
    </div>
  );
}
