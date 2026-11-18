"use client";

import React from "react";
import { CheckCircle2, Send } from "lucide-react";

const SUPPORT_EMAIL = "support@dhruto.com";

interface SmartFormProps {
  initialTopic?: string;
}

export function ContactSmartForm({ initialTopic = "onboarding" }: SmartFormProps) {
  const [topic, setTopic] = React.useState<string>(initialTopic);
  const [name, setName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");
  const [company, setCompany] = React.useState<string>("");
  const [monthlyVolume, setMonthlyVolume] = React.useState<string>("500-2000");
  const [techStack, setTechStack] = React.useState<string>("woocommerce");
  const [trackingId, setTrackingId] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");
  const [isSubmitted, setIsSubmitted] = React.useState<boolean>(false);

  const topics = [
    { id: "onboarding", label: "Merchant Onboarding", department: "Corporate Sales Desk" },
    { id: "api", label: "Developer & API", department: "Platform Engineering" },
    { id: "escalation", label: "Shipment Escalation", department: "Priority Hub Dispatch" },
    { id: "general", label: "General & Partnership", department: "Corporate Operations" },
  ];

  const currentTopicObj = topics.find((t) => t.id === topic) ?? topics[0]!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subject = `[${currentTopicObj.label}] ${name || "Merchant"} - Dhruto Inquiry`;
    let body = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nTopic: ${currentTopicObj.label}\n`;

    if (topic === "onboarding") {
      body += `Business / Store: ${company}\nMonthly Parcel Volume: ${monthlyVolume}\n`;
    } else if (topic === "api") {
      body += `Platform / Tech Stack: ${techStack}\nCompany: ${company}\n`;
    } else if (topic === "escalation") {
      body += `Tracking ID: ${trackingId}\n`;
    }

    body += `\nMessage:\n${message}\n`;

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setIsSubmitted(true);
  };

  return (
    <section id="dispatch-form" className="relative scroll-mt-24 py-20 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            <span>INTELLIGENT INQUIRY DISPATCHER</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Route Your Request to the Specialized Operations Team
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Choose your inquiry category to auto-route to the appropriate dispatch engineer or enterprise territory manager.
          </p>
        </div>

        {/* Category Pill Switcher */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
          {topics.map((t) => {
            const isActive = topic === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopic(t.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main Grid: Left Form, Right Live Ticket Preview */}
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-12">
          {/* Form Card (7 cols) */}
          <div className="rounded-3xl bg-surface p-6 sm:p-8 lg:col-span-7">
            {isSubmitted ? (
              <div className="py-12 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/20 text-success">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <h3 className="mt-4 text-2xl font-bold text-foreground">
                  Dispatch Ticket Prepared
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  We have triggered your default email application with this ticket pre-filled. You can also reach our live dispatch line directly.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="rounded-xl bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
                  >
                    Edit Message
                  </button>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Send to {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-foreground">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tanvir Hasan"
                      className="mt-1.5 w-full rounded-xl bg-field px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. merchant@mystore.com"
                      className="mt-1.5 w-full rounded-xl bg-field px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-foreground">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1712-XXXXXX"
                      className="mt-1.5 w-full rounded-xl bg-field px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      {topic === "escalation" ? "Tracking ID" : "Company / Store Name"}
                    </label>
                    {topic === "escalation" ? (
                      <input
                        type="text"
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        placeholder="e.g. DHR-8842-DH"
                        className="mt-1.5 w-full rounded-xl bg-field px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                      />
                    ) : (
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Artisan Footwear BD"
                        className="mt-1.5 w-full rounded-xl bg-field px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                      />
                    )}
                  </div>
                </div>

                {/* Specialized Fields based on Topic */}
                {topic === "onboarding" && (
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Expected Monthly Parcel Volume
                    </label>
                    <select
                      value={monthlyVolume}
                      onChange={(e) => setMonthlyVolume(e.target.value)}
                      className="mt-1.5 w-full rounded-xl bg-field px-3.5 py-2.5 text-sm text-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                    >
                      <option value="100-300">100 to 300 shipments / month (Starter)</option>
                      <option value="500-2000">300 to 2,000 shipments / month (Growth Brand)</option>
                      <option value="2000-10000">2,000 to 10,000 shipments / month (Scale)</option>
                      <option value="10000+">10,000+ shipments / month (Enterprise 3PL)</option>
                    </select>
                  </div>
                )}

                {topic === "api" && (
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Your E-commerce / Tech Stack
                    </label>
                    <select
                      value={techStack}
                      onChange={(e) => setTechStack(e.target.value)}
                      className="mt-1.5 w-full rounded-xl bg-field px-3.5 py-2.5 text-sm text-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                    >
                      <option value="woocommerce">WooCommerce (WordPress Plugin)</option>
                      <option value="shopify">Shopify Storefront</option>
                      <option value="custom-rest">Custom REST API (Node.js / Python / Laravel)</option>
                      <option value="erp">Custom Warehouse ERP / SAP</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-foreground">Message / Details *</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your delivery locations, timeline, or parcel inquiry..."
                    className="mt-1.5 w-full rounded-xl bg-field p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none hover:bg-field-hover focus:bg-surface"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    Routes directly to {currentTopicObj.department}
                  </span>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Dispatch Ticket</span>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Live Ticket Preview Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="cnt-ticket-preview">
              <div className="flex items-center justify-between pb-3 text-xs">
                <span className="text-success font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  LIVE DISPATCH ROUTING
                </span>
                <span className="font-mono text-muted-foreground">#DHR-ROUTER</span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Target Queue:</span>
                  <span className="font-bold text-primary">{currentTopicObj.department}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Response SLA:</span>
                  <span className="text-success font-bold">&lt; 18 Minutes</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Sender Identity:</span>
                  <span className="text-white font-mono">{name || "Pending input..."}</span>
                </div>
                {topic === "onboarding" && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Volume Tier:</span>
                    <span className="text-white font-mono">{monthlyVolume}</span>
                  </div>
                )}
                {topic === "api" && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Tech Stack:</span>
                    <span className="text-white font-mono">{techStack}</span>
                  </div>
                )}
                {topic === "escalation" && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Tracking Code:</span>
                    <span className="text-warning font-mono font-bold">{trackingId || "None"}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-xl bg-white/5 p-3.5 text-[11px] text-inverse-muted">
                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                  Live Dispatch Note:
                </div>
                <p className="mt-1 leading-relaxed">
                  Our operations desk continuously monitors line-haul manifests, driver locations, and sorting belts across all 64 districts.
                </p>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Direct Hotline:</span>
                <a
                  href="tel:+8809613347886"
                  className="font-mono font-bold text-white hover:text-primary transition"
                >
                  +880 9613-DHRUTO
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
