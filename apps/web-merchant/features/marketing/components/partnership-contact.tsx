"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";

export function PartnershipContact() {
  const [sent, setSent] = useState(false);
  const [service, setService] = useState("E-commerce Courier");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nService Needed: ${service}\n\nProject Details:\n${formData.message}`;
    window.location.href = `mailto:hello@dhruto.com?subject=${encodeURIComponent(
      `[${service}] Inquiry from ${formData.name}`,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <section id="contact" className="ct dk py-20 sm:py-28 relative">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="dhruto-container relative z-10 grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
        {/* Left Column */}
        <div>
          <span className="pill">Direct Consultation</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight mt-4">
            Let&apos;s build your logistics <em className="text-[var(--acc)] italic font-normal">advantage</em>
          </h2>
          <p className="text-base sm:text-lg text-white/70 mt-4 leading-relaxed max-w-lg">
            Share your monthly parcel volume and delivery requirements. Our logistics infrastructure team replies within 24 hours with guaranteed SLA pricing.
          </p>

          <div className="info">
            <div>
              <Mail className="h-5 w-5" />
              <span>
                <b>Email</b>
                hello@dhruto.com
              </span>
            </div>
            <div>
              <Phone className="h-5 w-5" />
              <span>
                <b>Hotline</b>
                +880 9612-DHRUTO (347886)
              </span>
            </div>
            <div>
              <MapPin className="h-5 w-5" />
              <span>
                <b>Central Hub HQ</b>
                Tejgaon Industrial Area, Dhaka 1208, Bangladesh
              </span>
            </div>
          </div>
        </div>

        {/* Right Form */}
        <form onSubmit={handleSubmit} className="fm text-foreground">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Request Partnership Quote</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in your details and we will reach out within 24 business hours.
            </p>
          </div>

          <div className="f2">
            <div className="f">
              <label htmlFor="ct-name">Full Name</label>
              <input
                id="ct-name"
                required
                placeholder="Rahim Uddin"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-field rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:bg-white hover:bg-field-hover"
              />
            </div>
            <div className="f">
              <label htmlFor="ct-email">Work Email</label>
              <input
                id="ct-email"
                type="email"
                required
                placeholder="rahim@store.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-field rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:bg-white hover:bg-field-hover"
              />
            </div>
          </div>

          <div className="f">
            <label htmlFor="ct-phone">Phone Number</label>
            <input
              id="ct-phone"
              type="tel"
              placeholder="+880 1700-000000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-field rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:bg-white hover:bg-field-hover"
            />
          </div>

          <fieldset className="f chips">
            <legend className="text-xs font-semibold text-foreground">What service do you need?</legend>
            {[
              "E-commerce Courier",
              "Enterprise Line-Haul",
              "Fulfillment & Warehousing",
              "API & Custom Tech",
              "Corporate Account",
            ].map((s) => (
              <label key={s}>
                <input
                  type="radio"
                  name="service"
                  value={s}
                  checked={service === s}
                  onChange={() => setService(s)}
                />
                <span>{s}</span>
              </label>
            ))}
          </fieldset>

          <div className="f">
            <label htmlFor="ct-msg">Parcel Volume &amp; Target Locations</label>
            <textarea
              id="ct-msg"
              required
              rows={3}
              placeholder="e.g. 5,000 parcels/month inside Dhaka, expanding to Chittagong..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-field rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:bg-white resize-y hover:bg-field-hover"
            />
          </div>

          <button
            type="submit"
            className="btn-bd w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2"
          >
            Send Partnership Request
            <ArrowRight className="h-4 w-4 ar" />
          </button>

          {sent && (
            <p className="text-xs text-success-soft-foreground bg-success-soft p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-none" />
              Opening your default email client. If it doesn&apos;t open, email us directly at hello@dhruto.com.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
