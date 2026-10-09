"use client";

import React from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const PRICING_FAQS: FAQItem[] = [
  {
    question: "How is billable parcel weight calculated?",
    answer:
      "Charges are calculated based on whichever is higher between actual gross weight and volumetric weight (Length × Width × Height in cm ÷ 5000). The base published rate covers up to 1.0 kg, with incremental charges applied strictly per additional kilogram.",
  },
  {
    question: "When and how is Cash on Delivery (COD) settled?",
    answer:
      "All cash collected by riders at customer doorsteps is verified at destination hubs and automatically reconciled into your merchant wallet the very next morning by 10:00 AM. You can withdraw directly to your bKash, Nagad, Rocket, or corporate BEFTN bank account without delays.",
  },
  {
    question: "How does Dhruto prevent courier return fraud and fake RTOs?",
    answer:
      "A parcel is never marked as returned based on a rider's whim. Our operating system enforces a mandatory 3-attempt delivery protocol, sends proactive SMS reminders with rider contact details, and requires documented recipient reason codes before return routing is initiated.",
  },
  {
    question: "Are there any hidden fuel surcharges, platform fees, or signup deposits?",
    answer:
      "No. Dhruto guarantees 100% transparent fee calculation. Opening an account is completely free with ৳0 deposit. What you see on your rate calculator before booking is the exact amount deducted from your settlement.",
  },
  {
    question: "Can I get customized discounted rates for high monthly parcel volume?",
    answer:
      "Yes. Merchants shipping over 300 parcels per month automatically qualify for discounted freight tiers and reduced COD rates. Enterprise retailers with 2,000+ parcels per month receive dedicated line-haul agreements, custom API endpoints, and dedicated account managers.",
  },
];

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>PRICING & FINANCIAL CLARITY</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Pricing Questions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Clear, honest answers about cash-on-delivery settlements, weight policies, and volume tiers.
          </p>
        </div>

        {/* Accordion List */}
        <div className="mt-14 space-y-3.5">
          {PRICING_FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-xs transition-all duration-200 hover:border-primary/40"
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
                  <div className="border-t border-border/40 px-5 pb-5 pt-3 text-sm leading-relaxed text-muted-foreground">
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
