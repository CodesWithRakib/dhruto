"use client";

import React from "react";

const PARTNERS = [
  "SHOPIFY",
  "WOOCOMMERCE",
  "DARAZ OPEN API",
  "BKASH PAYMENT",
  "NAGAD DIRECT",
  "CITY BANK COD",
  "DHAKA METRO LINE-HAUL",
  "CHITTAGONG PORT HUB",
  "SYLHET TRANSIT",
  "RAJSHAHI CENTRAL",
  "BARISAL WATERWAY",
  "RANGPUR EXPRESS",
];

export function PartnerMarquee() {
  const list = [...PARTNERS, ...PARTNERS];

  return (
    <div className="mq bg-[var(--dk2)] border-y border-white/5 py-4" aria-hidden="true">
      <div className="mq-track">
        {list.map((item, idx) => (
          <span key={`${item}-${idx}`} className="text-xs sm:text-sm tracking-widest text-white/50 hover:text-[var(--acc)] transition-colors">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
