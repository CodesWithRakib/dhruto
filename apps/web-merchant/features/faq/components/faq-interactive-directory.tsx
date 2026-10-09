"use client";

import React, { useState, useMemo } from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  SearchX,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
  category?: string;
  actionLink?: {
    href: string;
    label: string;
  };
  badge?: string;
}

interface FaqInteractiveDirectoryProps {
  baseItems: { question: string; answer: string }[];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeCategory: string;
  onCategorySelect: (cat: string) => void;
}

export function FaqInteractiveDirectory({
  baseItems,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategorySelect,
}: FaqInteractiveDirectoryProps) {
  const [feedbackState, setFeedbackState] = useState<Record<number, "up" | "down">>({});

  // Merge baseItems with enriched enterprise metadata and additional merchant FAQs
  const allItems: FaqItem[] = useMemo(() => {
    const list: FaqItem[] = [
      {
        id: "faq-1",
        question: baseItems[0]?.question || "How do I book a parcel?",
        answer: baseItems[0]?.answer || "Create a merchant account and book directly from the dashboard, or connect your store to the Dhruto API for automatic bookings.",
        category: "booking",
        badge: "Booking",
        actionLink: { href: "/register", label: "Open Merchant Account" },
      },
      {
        id: "faq-2",
        question: baseItems[1]?.question || "How long does delivery take?",
        answer: baseItems[1]?.answer || "Timelines depend on the origin, destination and service. Same-day delivery is available within the city, while nationwide delivery typically takes a few working days.",
        category: "delivery",
        badge: "Timelines",
        actionLink: { href: "/services", label: "Explore Service Timelines" },
      },
      {
        id: "faq-3",
        question: baseItems[2]?.question || "How does cash on delivery work?",
        answer: baseItems[2]?.answer || "The rider collects the COD amount at the doorstep. It is then reconciled at the hub and settled into your merchant wallet.",
        category: "cod",
        badge: "COD Escrow",
        actionLink: { href: "/pricing", label: "View Payout Rules" },
      },
      {
        id: "faq-4",
        question: baseItems[3]?.question || "Can I track a parcel without an account?",
        answer: baseItems[3]?.answer || "Yes. Anyone with a tracking ID can use the public tracking page to view the parcel's status timeline.",
        category: "tracking",
        badge: "Tracking",
        actionLink: { href: "/track", label: "Go to Live Tracker" },
      },
      {
        id: "faq-5",
        question: baseItems[4]?.question || "What happens if delivery fails?",
        answer: baseItems[4]?.answer || "The parcel follows the return-to-origin flow and is returned to the merchant instead of being abandoned.",
        category: "delivery",
        badge: "RTO & Returns",
        actionLink: { href: "/terms", label: "View RTO SLA Policy" },
      },
      {
        id: "faq-6",
        question: baseItems[5]?.question || "How are delivery charges calculated?",
        answer: baseItems[5]?.answer || "Charges are based on the parcel's billable weight and the destination zone, plus any cash-on-delivery handling fee.",
        category: "cod",
        badge: "Rates",
        actionLink: { href: "/pricing", label: "Use Interactive Calculator" },
      },
      {
        id: "faq-7",
        question: baseItems[6]?.question || "Can I integrate my own store?",
        answer: baseItems[6]?.answer || "Yes. Dhruto exposes an API with signed webhooks so your systems can create bookings and receive status updates automatically.",
        category: "api",
        badge: "Developer API",
        actionLink: { href: "/contact", label: "Request API Credentials" },
      },
      {
        id: "faq-8",
        question: baseItems[7]?.question || "Is Dhruto available in Bangla?",
        answer: baseItems[7]?.answer || "Yes. The merchant portal, rider terminal and public pages are all available in both English and Bangla.",
        category: "general",
        badge: "Localization",
      },
      // Additional enterprise questions
      {
        id: "faq-9",
        question: "When does COD money get transferred to my bank or bKash?",
        answer: "Dhruto operates an automated T+1 remittance schedule. Cash collected by riders today is reconciled at evening hub cut-off and disbursed directly to your registered bank account (via BEFTN/NPSB) or bKash/Nagad wallet the next business morning.",
        category: "cod",
        badge: "Next-Day Payout",
        actionLink: { href: "/pricing", label: "Check Payout Schedules" },
      },
      {
        id: "faq-10",
        question: "Can I bulk upload parcels from an Excel or CSV file?",
        answer: "Yes. In the Merchant Dashboard, navigate to 'Bookings > Bulk Import'. You can upload thousands of orders in seconds using our standardized spreadsheet template, complete with automated address geocoding and duplicate detection.",
        category: "booking",
        badge: "Bulk Operations",
        actionLink: { href: "/register", label: "Access Merchant Portal" },
      },
      {
        id: "faq-11",
        question: "How does Dhruto protect high-value fragile merchandise?",
        answer: "All parcels declared in the merchant portal are covered under our 100% In-Transit Escrow Insurance. If a shipment suffers transit damage or loss while in Dhruto custody, you can submit a photographic claim in your dashboard for fast-track 72-hour compensation.",
        category: "delivery",
        badge: "Cargo Protection",
        actionLink: { href: "/terms", label: "Read Insurance Guarantee" },
      },
      {
        id: "faq-12",
        question: "Do you support real-time Webhook event notifications?",
        answer: "Yes. Our REST API delivers HMAC-SHA256 signed webhooks for lifecycle events including 'parcel.picked_up', 'parcel.in_transit', 'parcel.out_for_delivery', 'parcel.delivered', and 'parcel.rto_initiated'.",
        category: "api",
        badge: "Webhooks",
        actionLink: { href: "/contact", label: "Contact Engineering Team" },
      },
    ];

    // If there are more baseItems passed, append them
    if (baseItems.length > 8) {
      for (let i = 8; i < baseItems.length; i++) {
        const it = baseItems[i];
        if (it) {
          list.push({
            id: `faq-base-${i + 1}`,
            question: it.question,
            answer: it.answer,
            category: "general",
            badge: "General",
          });
        }
      }
    }

    return list;
  }, [baseItems]);

  // Filtering
  const filteredItems = useMemo(() => {
    let result = allItems;

    if (activeCategory !== "all") {
      result = result.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.badge?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allItems, activeCategory, searchQuery]);

  const handleVote = (idx: number, type: "up" | "down") => {
    setFeedbackState((prev) => ({ ...prev, [idx]: type }));
  };

  return (
    <section id="faq-directory" className="relative py-20 bg-surface border-b border-border/80 scroll-mt-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Results Counter & Search Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Interactive FAQ Index
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
              Browsing {filteredItems.length} Solution{filteredItems.length === 1 ? "" : "s"}
            </h2>
          </div>

          {searchQuery && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary font-medium">
              <Search className="h-3.5 w-3.5" />
              <span>Query: &quot;{searchQuery}&quot;</span>
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="ml-1 rounded p-0.5 hover:bg-primary/20 font-bold"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-border/80 bg-card p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <SearchX className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">
              No matching answers found
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find any articles matching &quot;{searchQuery}&quot;. Try searching for &quot;COD&quot;, &quot;payout&quot;, &quot;rates&quot;, or reach out directly to our live operations desk.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onCategorySelect("all");
                }}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition"
              >
                Reset All Filters
              </button>
              <Link
                href="/contact"
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                Contact Operations Desk
              </Link>
            </div>
          </div>
        ) : (
          /* Accordion Feed */
          <div className="mt-8 space-y-4">
            {filteredItems.map((item, idx) => {
              const voted = feedbackState[idx];

              return (
                <details
                  key={item.id || idx}
                  className="faq-item group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md open:border-primary/50 open:bg-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-base font-bold text-foreground select-none sm:p-6 sm:text-lg">
                    <div className="flex items-center gap-3 pr-2">
                      {item.badge && (
                        <span className="hidden sm:inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                      <span>{item.question}</span>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground transition-transform duration-200 group-open:border-primary/40 group-open:bg-primary/10 group-open:text-primary">
                      <ChevronDown className="faq-chevron h-4 w-4 transition-transform duration-200" />
                    </span>
                  </summary>

                  <div className="faq-answer border-t border-border/40 px-5 pb-6 pt-4 sm:px-6">
                    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {item.answer}
                    </p>

                    {/* Action link & Feedback Row */}
                    <div className="mt-6 pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-4 text-xs">
                      {item.actionLink ? (
                        <Link
                          href={item.actionLink.href}
                          className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
                        >
                          <span>{item.actionLink.label}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span>Standard Carrier Protocol</span>
                        </span>
                      )}

                      {/* Was this helpful voting */}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Helpful?</span>
                        {voted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <Check className="h-3 w-3" />
                            <span>Thanks for the feedback!</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleVote(idx, "up")}
                              aria-label="Mark helpful"
                              className="faq-vote-btn rounded-lg border border-border/80 bg-surface p-1.5 text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-500"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVote(idx, "down")}
                              aria-label="Mark unhelpful"
                              className="faq-vote-btn rounded-lg border border-border/80 bg-surface p-1.5 text-muted-foreground hover:border-rose-500/50 hover:text-rose-500"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
