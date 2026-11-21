"use client";

import React from "react";
import { Truck } from "lucide-react";
import type { ShippingLabelResponse } from "@dhruto/contracts";

interface ThermalShippingLabelProps {
  label: ShippingLabelResponse;
  locale?: string;
}

/**
 * Standard 4in x 6in thermal shipping label component.
 *
 * Engineered strictly in pure black-and-white with heavy borders for
 * 203/300 DPI direct-thermal and thermal-transfer roll printers (Zebra,
 * Xprinter, TSC, Dymo). Includes:
 * - Code 128 linear barcode (SVG)
 * - 2D QR Code vector (SVG) for live smartphone scanning
 * - High-contrast inverted routing & destination sort block
 * - High-visibility COD Cash Collection warning badge
 * - Perforation fold / cut guide
 */
export function ThermalShippingLabel({ label, locale = "en" }: ThermalShippingLabelProps) {
  const isCod = label.codAmount > 0;
  const sortCode = `${label.district.slice(0, 3).toUpperCase()}-${label.thana.slice(0, 3).toUpperCase()}`;

  return (
    <div className="dhruto-label relative mx-auto w-[4in] min-h-[5.95in] max-h-[6in] overflow-hidden border-2 border-black bg-white p-2.5 font-sans text-black box-border flex flex-col justify-between select-none">
      <div>
        {/* Header: Brand & High-Contrast Routing Sort Block */}
        <div className="flex items-stretch justify-between border-b-2 border-black pb-2">
          <div className="flex flex-col justify-between pr-2">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center bg-black p-1 text-white">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <span className="text-xl font-black tracking-tighter leading-none block">DHRUTO</span>
                <span className="text-[9px] font-black tracking-widest text-black uppercase block">
                  EXPRESS LOGISTICS
                </span>
              </div>
            </div>
            <p className="mt-1 text-[8.5px] font-bold uppercase tracking-tight text-black">
              ORIGIN: {label.originHub || "CENTRAL HUB"}
            </p>
          </div>

          {/* High-visibility Inverted Destination Sort Box */}
          <div className="flex flex-col items-end justify-center bg-black px-2.5 py-1 text-right text-white">
            <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-90">
              ROUTING DESTINATION
            </span>
            <span className="text-sm font-black uppercase tracking-tight leading-tight">
              {label.routingHub || "CENTRAL HUB"}
            </span>
            <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold">
              <span className="bg-white px-1 py-0.2 text-black font-black uppercase">
                {sortCode}
              </span>
              <span className="uppercase tracking-tight text-white/90">
                {label.zone.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Barcode & Tracking Code + QR Code */}
        <div className="border-b-2 border-black py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Linear Code 128 Barcode */}
            <div className="flex-1 min-w-0">
              <div
                className="flex h-14 w-full items-center justify-center overflow-hidden [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: label.barcodeSvg }}
              />
              <p className="mt-0.5 text-center font-mono text-sm font-black tracking-widest">
                {label.trackingCode}
              </p>
            </div>

            {/* 2D QR Code */}
            {label.qrCodeSvg ? (
              <div className="flex shrink-0 flex-col items-center justify-center pl-2 border-l border-black/30">
                <div
                  className="h-16 w-16 overflow-hidden [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: label.qrCodeSvg }}
                />
                <span className="mt-0.5 text-[7px] font-bold uppercase tracking-tighter">
                  SCAN TO TRACK
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Recipient Details & COD Collection Notice */}
        <div className="grid grid-cols-12 border-b-2 border-black">
          {/* Destination Ship To */}
          <div className="col-span-7 border-r-2 border-black p-2 space-y-1">
            <span className="inline-block bg-black px-1 py-0.2 text-[8px] font-black uppercase text-white tracking-wider">
              SHIP TO / RECIPIENT
            </span>
            <p className="text-sm font-black uppercase leading-tight text-black line-clamp-1">
              {label.recipientName}
            </p>
            <p className="font-mono text-xs font-black tracking-wider text-black">
              {label.recipientPhone}
            </p>
            <p className="text-[10px] leading-tight text-black line-clamp-2">
              {label.deliveryAddress}
            </p>
            {/* High-visibility Thana & District Highlight */}
            <div className="mt-1 inline-block border border-black bg-gray-100 px-1.5 py-0.5">
              <p className="text-[11px] font-black uppercase tracking-tight text-black">
                {label.thana}, {label.district}
              </p>
            </div>
          </div>

          {/* Prominent COD Badge */}
          <div
            className={`col-span-5 flex flex-col items-center justify-center p-2 text-center ${
              isCod ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            <span
              className={`text-[8px] font-black uppercase tracking-wider ${
                isCod ? "text-white/80" : "text-black/80"
              }`}
            >
              {isCod ? "CASH ON DELIVERY" : "PAYMENT STATUS"}
            </span>
            <span className="mt-0.5 text-xl font-black leading-none tracking-tight">
              ৳{label.codAmount.toLocaleString(locale)}
            </span>
            <span
              className={`mt-1 text-[8px] font-extrabold uppercase leading-tight px-1 py-0.5 ${
                isCod
                  ? "bg-white text-black font-black"
                  : "border border-black bg-gray-100 text-black font-black"
              }`}
            >
              {isCod ? "COLLECT CASH" : "PREPAID — NO COD"}
            </span>
          </div>
        </div>

        {/* Sender / Merchant Return Address */}
        <div className="border-b-2 border-black p-2">
          <span className="block text-[8px] font-extrabold uppercase text-black/70 tracking-wider">
            FROM / RETURN ADDRESS
          </span>
          <div className="mt-0.5 flex items-start justify-between gap-2 text-[10px] leading-tight">
            <div className="min-w-0 flex-1">
              <p className="font-black uppercase text-black truncate">{label.merchantName}</p>
              <p className="font-mono font-bold text-black">{label.merchantPhone}</p>
              <p className="text-black line-clamp-1 text-[9.5px]">{label.pickupAddress}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-[8px] font-bold uppercase text-black/70">WEIGHT</span>
              <span className="text-xs font-black text-black">{label.weightKg.toFixed(2)} KG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Specs & Perforation Cut Line */}
      <div className="pt-1.5">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-tight text-black pb-1.5">
          <span>DATE: {new Date(label.createdDate).toLocaleDateString(locale)}</span>
          <span>SRV: STANDARD NEXT-DAY</span>
          <span>DHRUTO LOGISTICS BD</span>
        </div>

        {/* Perforated Fold / Cut Guide */}
        <div className="relative flex items-center justify-center border-t border-dashed border-black/70 pt-1 text-[7.5px] font-bold text-black/70 tracking-wider">
          <span>✂ FOLD OR CUT HERE ✂</span>
        </div>
      </div>
    </div>
  );
}
