"use client";

import React from "react";
import {
  ArrowRight,
  Code2,
  Headphones,
  MapPin,
  Sparkles,
} from "lucide-react";

interface ChannelCard {
  id: string;
  title: string;
  subtitle: string;
  primaryValue: string;
  secondaryValue: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  tagColor: string;
  actionLabel: string;
  actionHref: string;
}

const CHANNELS: ChannelCard[] = [
  {
    id: "sales",
    title: "Merchant Sales & Onboarding",
    subtitle: "Custom volume rate agreements, dedicated line-haul routes, and enterprise SLA onboarding.",
    primaryValue: "sales@dhruto.com",
    secondaryValue: "+880 9613-DHRUTO (Sales)",
    icon: Sparkles,
    tag: "SCHEDULE CALL",
    tagColor: "bg-primary/10 text-primary border-primary/20",
    actionLabel: "Email Corporate Sales",
    actionHref: "mailto:sales@dhruto.com?subject=Merchant%20Volume%20Inquiry",
  },
  {
    id: "support",
    title: "Live Operations & Escalations",
    subtitle: "Real-time dispatch coordination for in-transit parcels, delivery exception resolves, and rider contacts.",
    primaryValue: "support@dhruto.com",
    secondaryValue: "Sun–Thu, 9:00–21:00 BST",
    icon: Headphones,
    tag: "LIVE DESK",
    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    actionLabel: "Reach Operations Desk",
    actionHref: "mailto:support@dhruto.com?subject=Shipment%20Escalation",
  },
  {
    id: "developers",
    title: "Developer & API Integrations",
    subtitle: "Signed HMAC webhooks, high-throughput REST API onboarding, and WooCommerce/Shopify plugins.",
    primaryValue: "developers@dhruto.com",
    secondaryValue: "API Sandbox & Webhook Help",
    icon: Code2,
    tag: "SUB-200MS API",
    tagColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    actionLabel: "Email API Engineers",
    actionHref: "mailto:developers@dhruto.com?subject=API%20Integration%20Assistance",
  },
  {
    id: "hq",
    title: "Central Sorting Hub & HQ",
    subtitle: "Direct merchant parcel drop-off bay, physical security handoffs, and corporate headquarters.",
    primaryValue: "Plot 14, Road 11, Block C, Banani",
    secondaryValue: "Dhaka-1213, Bangladesh",
    icon: MapPin,
    tag: "MERCHANT DROP-OFF",
    tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    actionLabel: "View Hub Location",
    actionHref: "#regional-hubs",
  },
];

export function ContactChannels() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className="cnt-channel-card group justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${channel.tagColor}`}
                    >
                      {channel.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground">
                    {channel.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {channel.subtitle}
                  </p>
                </div>

                <div className="mt-6 border-t border-border/60 pt-4">
                  <div className="font-semibold text-sm text-foreground">
                    {channel.primaryValue}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {channel.secondaryValue}
                  </div>

                  <a
                    href={channel.actionHref}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary transition hover:underline"
                  >
                    <span>{channel.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
