"use client";

import React from "react";
import { Truck, Coins, ArrowRight, Sparkles, Layers, Cpu, Navigation, Building2 } from "lucide-react";
import { Link } from "@/lib/navigation";

export function ServicesSection() {
  return (
    <section id="services" className="relative py-20 sm:py-28 overflow-hidden bg-[var(--soft-bg)]">
      <div className="dhruto-container relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="pill">Logistics Operating System</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] text-balance">
            Premium infrastructure, <em className="text-[var(--acc2)] italic font-normal">built to scale</em>
          </h2>
          <p className="text-base sm:text-lg text-[var(--muted-text)] max-w-xl mx-auto leading-relaxed">
            Enterprise-grade parcel delivery, automated COD settlements, and deep 64-district line-haul connectivity.
          </p>
        </div>

        <div className="cards">
          {/* 1. Featured Double-Height Hero Card */}
          <div className="sv feat">
            <div className="ico">
              <Truck className="h-5 w-5" />
            </div>
            <h3>Nationwide Express &amp; Line-Haul</h3>
            <p>
              Dedicated cargo sorting hubs connecting Dhaka to all 64 districts within 24–48 hours with guaranteed SLA.
            </p>
            <ul>
              <li>60-Minute Metro Rapid Pickup</li>
              <li>Automated Next-Day Bank &amp; MFS COD</li>
              <li>100% Escrow Cargo Insurance</li>
              <li>Real-time GPS Line-Haul Tracking</li>
            </ul>
            <Link href="/register" className="btn-bl inline-flex items-center gap-2 mt-auto self-start">
              <Sparkles className="h-4 w-4" />
              Start Shipping
              <ArrowRight className="h-4 w-4 ar" />
            </Link>
          </div>

          {/* 2. Automated COD & Instant Wallet */}
          <div className="sv">
            <div className="ico">
              <Coins className="h-5 w-5" />
            </div>
            <h3>Automated COD Settlement</h3>
            <p>Zero liquidity crunch. Automatic next-day transfers directly into your bank or mobile wallet.</p>
            <div className="tags">
              <span>Next-Day Payout</span>
              <span>bKash / Nagad</span>
              <span>Bank EFT</span>
            </div>
          </div>

          {/* 3. Doorstep Metro Delivery */}
          <div className="sv">
            <div className="ico">
              <Navigation className="h-5 w-5" />
            </div>
            <h3>Hyperlocal Metro Express</h3>
            <p>45-minute to same-day delivery inside Dhaka, Chittagong, and Sylhet metro regions.</p>
            <div className="tags">
              <span>45-Min Express</span>
              <span>Rider GPS</span>
              <span>OTP Verification</span>
            </div>
          </div>

          {/* 4. Multi-Channel E-Commerce Sync */}
          <div className="sv">
            <div className="ico">
              <Layers className="h-5 w-5" />
            </div>
            <h3>Storefront Integrations</h3>
            <p>One-click order sync and instant manifest printing for high-volume store platforms.</p>
            <div className="tags">
              <span>Shopify</span>
              <span>WooCommerce</span>
              <span>Daraz API</span>
            </div>
          </div>

          {/* 5. 64-District Hub Cross-Dock */}
          <div className="sv">
            <div className="ico">
              <Building2 className="h-5 w-5" />
            </div>
            <h3>64-District Line-Haul Network</h3>
            <p>Central cross-dock facilities and line-haul trunks ensuring safe transit for breakable and high-value cargo.</p>
            <div className="tags">
              <span>495 Thanas</span>
              <span>Barcode Sorting</span>
              <span>Zero Loss SLA</span>
            </div>
          </div>

          {/* 6. Wide Full-Width Card: AI RTO Protection */}
          <div className="sv wide">
            <div className="ico">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3>AI Return &amp; Fraud Prevention Engine</h3>
              <p>Predictive buyer delivery history and address verification that reduces failed deliveries (RTO) by up to 34%.</p>
            </div>
            <div className="tags">
              <span>Delivery Score</span>
              <span>Address Validation</span>
              <span>Fraud Radar</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
