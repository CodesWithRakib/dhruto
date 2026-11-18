"use client";

import React from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const CONTACT_FAQS: FAQItem[] = [
  {
    question: "How quickly does the Dhruto operations desk respond to merchant tickets?",
    answer:
      "All merchant inquiries and parcel tickets are triaged by human dispatchers during active shift hours with an average first-response time under 18 minutes. For high-priority in-transit delivery exceptions, dispatchers initiate direct telephone coordination with riders.",
  },
  {
    question: "Can I drop off parcels in person at the central hub to catch same-night line-haul?",
    answer:
      "Yes. Merchants and fulfillment centers located in Dhaka can drop parcels directly at our Central Tejgaon / Banani sortation facility until 8:30 PM. Parcels will be immediately barcode-inducted and loaded onto nocturnal highway trailers departing for regional divisional hubs.",
  },
  {
    question: "Do you provide weekend and public holiday delivery support?",
    answer:
      "Yes. Our physical line-haul fleet and hub sorters operate 24/7, including Fridays and public holidays. Last-mile deliveries and emergency escalation hotlines are staffed every single day of the week to ensure zero supply-chain bottlenecks.",
  },
  {
    question: "How do I get a dedicated WhatsApp Account Manager?",
    answer:
      "Merchants shipping over 200 parcels per month automatically receive a designated territory account manager with direct WhatsApp and telephone contact for expedited pickup batching and instant billing reconciliation.",
  },
  {
    question: "How do I schedule a technical onboarding session for developer REST API & Webhooks?",
    answer:
      "You can select the 'Developer & API' option on our dispatch form or email developers@dhruto.com. A platform integrations engineer will schedule a Google Meet call to assist with sandbox testing, WooCommerce/Shopify plugin setup, and webhook signature verification.",
  },
];

export function ContactFAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>COMMUNICATION & OPS CLARITY</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Operations & Support Questions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Everything you need to know about contacting territory dispatchers, emergency parcel escalations, and hub drop-offs.
          </p>
        </div>

        {/* Accordion Items */}
        <div className="mt-14 space-y-3.5">
          {CONTACT_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl bg-surface transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-5 text-left font-semibold text-foreground transition-colors hover:text-primary"
                >
                  <span className="text-base pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 flex-none text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-3 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
