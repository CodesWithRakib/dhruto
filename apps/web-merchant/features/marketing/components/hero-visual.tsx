"use client";

import React from "react";

export function HeroVisual() {
  return (
    <div className="mockwrap" aria-hidden="true">
      <div className="dashb">
        {/* Top Header */}
        <div className="dt">
          <span className="dchip">
            <i>D</i>Dhruto OS
          </span>
          <div className="dtabs hidden md:flex">
            <b>Overview</b>
            <span>Live Shipments</span>
            <span>Line-Haul Radar</span>
            <span>COD Payouts</span>
            <span>64 Hubs</span>
            <span>API Telemetry</span>
          </div>
          <div className="duser">
            <i></i>
            <span>
              Dispatch Studio
              <small>dispatch@dhruto.com</small>
            </span>
          </div>
        </div>

        {/* Body Area */}
        <div className="dbody">
          {/* Side Icon Rail */}
          <div className="dside">
            <i>📊</i>
            <i>📦</i>
            <i>⚡</i>
            <i>💰</i>
            <i>🗺️</i>
            <i>⚙️</i>
          </div>

          {/* Main Dashboard Panel */}
          <div className="dmain">
            <h4>Good morning, Dispatch Team</h4>
            <p>Nationwide 64 districts • live line-haul tracking</p>

            <div className="dgrid">
              {/* Card 1: Revenue / COD */}
              <div className="dc">
                <small>Total COD Collected</small>
                <b>৳ 48,20,000</b>
                <span className="up">
                  <u>↑ 38%</u>vs last month
                </span>
                <div className="dbtns">
                  <span>Auto Payout</span>
                  <span>Audit Trail</span>
                </div>
                <div className="dw">Network Sprints &nbsp;|&nbsp; 64 Active</div>
                <div className="dw3">
                  <div>
                    Metro<b>45m</b>
                    <em>Active</em>
                  </div>
                  <div>
                    Line-Haul<b>18h</b>
                    <em>Inter-city</em>
                  </div>
                  <div>
                    COD<b>100%</b>
                    <em>Settled</em>
                  </div>
                </div>
              </div>

              {/* Card 2: 4-Stat Grid */}
              <div className="d4">
                <div className="dc">
                  <small>Active Parcels</small>
                  <b>12.4K</b>
                  <span className="up">
                    <u>↑ 12%</u>Today
                  </span>
                </div>
                <div className="dc">
                  <small>Avg. Metro SLA</small>
                  <b>45m</b>
                  <span className="up">
                    <u>⚡ Ultra</u>Doorstep
                  </span>
                </div>
                <div className="dc">
                  <small>Districts covered</small>
                  <b>64</b>
                  <span className="up">
                    <u>↑ 0.1%</u>Radar active
                  </span>
                </div>
                <div className="dc">
                  <small>Hub Cross-docks</small>
                  <b>64</b>
                  <span className="up">
                    <u>✓ 495</u>Thanas
                  </span>
                </div>
              </div>

              {/* Card 3: Growth & Throughput Chart */}
              <div className="dc">
                <small style={{ fontSize: "1.3em", color: "hsl(var(--foreground))", fontWeight: 600 }}>
                  Delivery Throughput
                </small>
                <small style={{ fontSize: "0.9em", color: "hsl(var(--muted-foreground))", marginTop: "0.3em" }}>
                  Real-time parcels delivered vs settled COD
                </small>
                <div className="dchart">
                  <div className="dleg">
                    Parcels and COD Settlement
                    <span>
                      <i></i>Parcels<i></i>Settled
                    </span>
                  </div>
                  <div className="bars" id="bars">
                    <div>
                      <i style={{ height: "45%" }}></i>
                      <u style={{ height: "30%" }}></u>
                    </div>
                    <div>
                      <i style={{ height: "65%" }}></i>
                      <u style={{ height: "48%" }}></u>
                    </div>
                    <div>
                      <i style={{ height: "55%" }}></i>
                      <u style={{ height: "40%" }}></u>
                    </div>
                    <div>
                      <i style={{ height: "80%" }}></i>
                      <u style={{ height: "62%" }}></u>
                    </div>
                    <div>
                      <i style={{ height: "70%" }}></i>
                      <u style={{ height: "50%" }}></u>
                    </div>
                    <div>
                      <i style={{ height: "92%" }}></i>
                      <u style={{ height: "75%" }}></u>
                    </div>
                    <div>
                      <i style={{ height: "85%" }}></i>
                      <u style={{ height: "68%" }}></u>
                    </div>
                    <div>
                      <i style={{ height: "98%" }}></i>
                      <u style={{ height: "82%" }}></u>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
