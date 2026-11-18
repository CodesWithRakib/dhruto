"use client";

import React from "react";

/**
 * What the platform actually does. No third-party brand names: Dhruto has no
 * partnership integrations with marketplaces or banks, only payout methods.
 */
const PARTNERS = [
  "64 DISTRICTS",
  "CASH ON DELIVERY",
  "BKASH PAYOUTS",
  "NAGAD PAYOUTS",
  "ROCKET PAYOUTS",
  "BANK TRANSFER PAYOUTS",
  "DOORSTEP OTP",
  "LIVE TRACKING",
  "BULK CSV IMPORT",
  "REST API",
  "SIGNED WEBHOOKS",
  "BANGLA & ENGLISH",
];

export function PartnerMarquee() {
  const list = [...PARTNERS, ...PARTNERS];

  return (
    <div className="mq bg-[var(--dk2)] py-4" aria-hidden="true">
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
