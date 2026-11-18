"use client";

import React from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowRight,
  Clock,
  Headphones,
  Mail,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

export function FaqEscalationDesk() {
  return (
    <section className="relative py-20 bg-surface">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left: Headline & Assurance */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Headphones className="h-3.5 w-3.5" />
                <span>UNRESOLVED QUERY ESCALATION</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Still Couldn&apos;t Find Your Answer?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Our operations controllers, billing engineers, and developer advocates are on standby 24 hours a day to assist with immediate booking emergencies or integration queries.
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-xs text-foreground/90">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-success" />
                  <span>Immediate Escalation: &lt;15 Mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>Direct Account Manager for High-Volume</span>
                </div>
              </div>
            </div>

            {/* Right: Channels Grid */}
            <div className="rounded-2xl bg-muted/30 p-6 lg:col-span-5 space-y-4">
              <a
                href="tel:+8809612345678"
                className="flex items-center justify-between rounded-xl bg-card p-4 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold">24/7 Voice Hotline</div>
                    <div className="text-sm font-bold text-foreground font-mono">+880 9612-DHRUTO</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </a>

              <a
                href="mailto:support@dhruto.com"
                className="flex items-center justify-between rounded-xl bg-card p-4 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold">Operations Helpdesk</div>
                    <div className="text-sm font-bold text-foreground">support@dhruto.com</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </a>

              <div className="pt-2">
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-foreground text-background py-3 text-xs font-bold transition hover:opacity-90"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Open Ticket on Full Support Desk</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
