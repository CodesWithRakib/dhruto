"use client";

import React, { useState, useEffect, useRef } from "react";

interface Review {
  initial: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  highlight: string;
}

const REVIEWS: Review[] = [
  {
    initial: "S",
    name: "Sadia Karim",
    role: "Founder",
    company: "StyleHub BD",
    quote: "Automated next-day bank transfers and live SMS updates doubled our repeat buyers. Our return rate ",
    highlight: "dropped by 34%",
  },
  {
    initial: "T",
    name: "Tanvir Ahmed",
    role: "CEO",
    company: "TechCart BD",
    quote: "Dhruto delivered our fragile electronics cargo with 99.4% SLA. The fraud radar and buyer score ",
    highlight: "saved us lakhs in RTO",
  },
  {
    initial: "M",
    name: "Mahmud Hasan",
    role: "Managing Director",
    company: "FactoryPro Direct",
    quote: "Clean REST APIs, instant bulk manifest printing, and rock-solid 64-district line-haul. Truly ",
    highlight: "an elite logistics OS",
  },
];

export function MerchantTestimonials() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPaused) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % REVIEWS.length);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  const activeReview = REVIEWS[activeIdx] ?? REVIEWS[0]!;

  return (
    <section id="testimonials" className="py-20 sm:py-28 bg-[var(--soft-bg)] overflow-hidden">
      <div className="dhruto-container">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="pill">Client Proof</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] text-balance">
            Loved by <em className="text-[var(--acc2)] italic font-normal">growing merchants</em>
          </h2>
          <p className="text-base sm:text-lg text-[var(--muted-text)] leading-relaxed">
            What e-commerce founders and enterprise supply chain leads say after switching to Dhruto.
          </p>
        </div>

        <div className="cl">
          {/* Left: By the Numbers panel */}
          <div className="cls">
            <small>By the numbers</small>
            <div className="cbig">
              99.4<sup>%</sup>
            </div>
            <p>On-time doorstep delivery SLA across all 64 districts nationwide.</p>
            <div className="c2">
              <div>
                <b>12K+</b>
                Merchants served
              </div>
              <div>
                <b>4.2M+</b>
                Parcels delivered
              </div>
            </div>
          </div>

          {/* Right: Interactive Testimonial Carousel */}
          <div
            className="clq"
            id="clq"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <span className="qm" aria-hidden="true">
              “
            </span>

            <div className="qs min-h-[160px] flex flex-col justify-between">
              <figure className="q">
                <blockquote>
                  {activeReview.quote}
                  <em>{activeReview.highlight}</em> after switching.
                </blockquote>

                <figcaption className="au">
                  <i>{activeReview.initial}</i>
                  <div>
                    {activeReview.name}
                    <span>
                      {activeReview.role}, {activeReview.company}
                    </span>
                  </div>
                  <span className="stars" aria-label="5 out of 5 stars">
                    ★★★★★
                  </span>
                </figcaption>
              </figure>
            </div>

            {/* Client Tabs underneath with active progress indicator line */}
            <div className="qt" aria-label="Clients">
              {REVIEWS.map((r, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={isActive ? "on" : ""}
                    aria-label={`Show review from ${r.name}`}
                  >
                    <u style={{ transform: isActive ? "scaleX(1)" : "scaleX(0)" }} />
                    <i>{r.initial}</i>
                    <span>
                      {r.name}
                      <span>{r.company}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
