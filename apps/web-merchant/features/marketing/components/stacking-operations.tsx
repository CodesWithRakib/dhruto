"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/lib/navigation";

export function StackingOperations() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    // 1. Intersection Observer for one-by-one reveal on scroll
    const observers: IntersectionObserver[] = [];
    cardRefs.current.forEach((el, index) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setRevealed((prev) => {
                const next = [...prev];
                next[index] = true;
                return next;
              });
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    // 2. Scroll-linked card stacking scale: as card[i+1] slides over card[i], card[i] scales down to 0.94
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!window.matchMedia("(min-width: 861px)").matches) {
          ticking = false;
          return;
        }

        const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
        cards.forEach((card, i) => {
          if (i === cards.length - 1) return;
          const nextCard = cards[i + 1];
          if (!nextCard) return;

          const rect = nextCard.getBoundingClientRect();
          const targetY = 140; // sticky offset top
          const startY = window.innerHeight;

          // Compute progress from 0 (next card enters bottom) to 1 (next card reaches sticky top)
          let progress = (startY - rect.top) / (startY - targetY);
          progress = Math.max(0, Math.min(1, progress));

          const scale = 1 - progress * 0.06; // 1 down to 0.94
          const opacity = 1 - progress * 0.18; // 1 down to 0.82

          const pcin = card.querySelector<HTMLElement>(".pcin");
          if (pcin) {
            pcin.style.transform = `scale(${scale.toFixed(4)})`;
            pcin.style.opacity = `${opacity.toFixed(3)}`;
          }
        });

        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observers.forEach((obs) => obs.disconnect());
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section id="work" className="py-20 sm:py-28 bg-[var(--soft-bg)] relative">
      <div className="dhruto-container" ref={containerRef}>
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <span className="pill">Operational Infrastructure</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] text-balance">
            Systems that speak <em className="text-[var(--acc2)] italic font-normal">for themselves</em>
          </h2>
          <p className="text-base sm:text-lg text-[var(--muted-text)] leading-relaxed">
            From one-click merchant storefront checkout to nationwide automated sort hubs.
          </p>
        </div>

        <div className="wk" id="wk">
          {/* Card 1: Multi-Channel Storefront & Delivery Tracking */}
          <article
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            className="pc t1"
            style={
              {
                "--i": 0,
                opacity: revealed[0] ? 1 : 0,
                transform: revealed[0] ? "translateY(0)" : "translateY(36px)",
                transition: "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
              } as React.CSSProperties
            }
          >
            <div className="pcin">
              <div className="pi">
                <div className="ptop">
                  01 / 03<span>E-Commerce Delivery</span>
                </div>
                <h3>
                  Merchant Storefront <em>Sync &amp; Tracking</em>
                </h3>
                <p>
                  Direct API integrations for Shopify, WooCommerce, and custom web stores. Instant automated label generation, rider dispatch, and live buyer tracking.
                </p>
                <div className="kf">
                  <b>10K+</b>
                  <span>
                    parcels processed daily
                    <br />
                    across multi-channel stores
                  </span>
                </div>
                <Link href="/register" className="btn-bl inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Connect Your Store
                  <ArrowRight className="h-4 w-4 ar" />
                </Link>
              </div>

              <div className="pv" aria-hidden="true">
                <div className="mkw">
                  <div className="mk store">
                    <div className="mbar">
                      <i />
                      <i />
                      <i />
                      <span>store.dhruto.com/orders</span>
                    </div>
                    <div className="snav">
                      <b>DhrutoStore</b>Shop<span>Vendors</span><span>Deals</span><i />
                    </div>
                    <div className="sban">
                      <small>Live Integration Active</small>
                      <b>Multi-Store Dispatch &amp; Labeling</b>
                      <span>Shopify &amp; WooCommerce</span>
                    </div>
                    <div className="sgrid">
                      <div><i />Sneakers<b>৳ 2,450</b></div>
                      <div><i />Backpack<b>৳ 1,890</b></div>
                      <div><i />Headphones<b>৳ 3,200</b></div>
                      <div><i />Watch<b>৳ 4,750</b></div>
                    </div>
                  </div>

                  <div className="flo o1">
                    <small>Order #5841 • Gulshan</small>
                    <b className="text-[var(--acc2)]">✓ On the Way (ETA 18m)</b>
                    <u />
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Automated Next-Day COD Settlement Wallet */}
          <article
            ref={(el) => {
              cardRefs.current[1] = el;
            }}
            className="pc t2"
            style={
              {
                "--i": 1,
                opacity: revealed[1] ? 1 : 0,
                transform: revealed[1] ? "translateY(0)" : "translateY(36px)",
                transition: "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
              } as React.CSSProperties
            }
          >
            <div className="pcin">
              <div className="pi">
                <div className="ptop">
                  02 / 03<span>Fintech COD Escrow</span>
                </div>
                <h3>
                  PayNext <em>COD Settlement</em>
                </h3>
                <p>
                  Zero cash-holding delay. Doorstep collections are reconciled immediately and disbursed next morning straight to your merchant bank account or bKash wallet.
                </p>
                <div className="kf">
                  <b>Instant</b>
                  <span>
                    automated settlements
                    <br />
                    with zero liquidity delay
                  </span>
                </div>
                <Link href="/register" className="btn-bd inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Explore Settlement
                  <ArrowRight className="h-4 w-4 ar" />
                </Link>
              </div>

              <div className="pv" aria-hidden="true">
                <div className="mkw">
                  <div className="mk phone">
                    <div className="phd">
                      <span>Good morning<b>Dhruto Wallet</b></span>
                      <i />
                    </div>
                    <div className="bal">
                      <small>Settled COD Balance</small>
                      <b>৳ 48,250</b>
                      <u>Escrow Verified</u>
                    </div>
                    <div className="acts">
                      <div><i />Disburse</div>
                      <div><i />Bank</div>
                      <div><i />bKash</div>
                      <div><i />Audit</div>
                    </div>
                    <div className="txs">
                      <div>
                        <i />
                        <span>
                          <b>Batch Settlement #4102</b>
                          Auto-transferred to City Bank
                        </span>
                        <em className="text-success">+৳ 32,400</em>
                      </div>
                      <div>
                        <i />
                        <span>
                          <b>bKash Merchant Disburse</b>
                          Dispatched today
                        </span>
                        <em className="text-success">+৳ 15,850</em>
                      </div>
                    </div>
                  </div>

                  <div className="flo o2">
                    <small>Auto-Disbursed 09:30 AM</small>
                    <b className="text-success-soft-foreground">✓ ৳ 48,250 Transferred</b>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Card 3: Enterprise Line-Haul & Sorting Hub ERP */}
          <article
            ref={(el) => {
              cardRefs.current[2] = el;
            }}
            className="pc t3"
            style={
              {
                "--i": 2,
                opacity: revealed[2] ? 1 : 0,
                transform: revealed[2] ? "translateY(0)" : "translateY(36px)",
                transition: "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.15s, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
              } as React.CSSProperties
            }
          >
            <div className="pcin">
              <div className="pi">
                <div className="ptop">
                  03 / 03<span>Line-Haul Operating System</span>
                </div>
                <h3>
                  HubOps <em>Enterprise ERP</em>
                </h3>
                <p>
                  High-throughput sorting facilities equipped with automated cage manifests, conveyor sorting, and line-haul truck tracking across all 64 districts.
                </p>
                <div className="kf">
                  <b>64</b>
                  <span>
                    central hubs connected
                    <br />
                    across all 8 divisions
                  </span>
                </div>
                <Link href="/contact" className="btn-bd inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Enterprise Inquiry
                  <ArrowRight className="h-4 w-4 ar" />
                </Link>
              </div>

              <div className="pv" aria-hidden="true">
                <div className="mkw">
                  <div className="mk erp">
                    <div className="mbar">
                      <i />
                      <i />
                      <i />
                      <span>hub-ops.dhruto.com/radar</span>
                    </div>
                    <div className="eb">
                      <div className="esd">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className="em">
                        <b>Tejgaon Central Sort Hub</b>
                        <div className="ek">
                          <div>
                            Active Couriers<b>340</b>
                          </div>
                          <div>
                            Parcels Today<b>18,420</b>
                          </div>
                          <div>
                            Districts covered<b>64</b>
                          </div>
                        </div>
                        <div className="ec">
                          Line-Haul Freight Throughput (24h)
                          <div className="ech">
                            <i style={{ height: "42%" }} />
                            <i style={{ height: "65%" }} />
                            <i style={{ height: "52%" }} />
                            <i style={{ height: "82%" }} />
                            <i style={{ height: "68%" }} />
                            <i style={{ height: "94%" }} />
                            <i style={{ height: "74%" }} />
                            <i style={{ height: "88%" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flo o3">
                    <small>Line-Haul Radar</small>
                    <b className="text-info">✓ Dhaka → Chittagong Dispatched</b>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
