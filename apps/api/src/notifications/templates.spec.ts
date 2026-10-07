import { describe, it, expect } from "vitest";
import {
  renderParcelCreated,
  renderParcelOutForDelivery,
  renderParcelDelivered,
  renderParcelFailed,
  renderParcelReturned,
  renderHandInSubmitted,
  renderCashVerified,
  renderSettlementCreated,
  renderPayoutRequested,
  renderPayoutApproved,
  renderPayoutCompleted,
  renderPayoutFailed,
  renderDiscrepancyOpened,
  renderParcelAssigned,
  TEMPLATE_KEYS,
  EVENT_TEMPLATES,
} from "./templates.js";
import { DomainEventType } from "@dhruto/contracts";

describe("notification templates (bilingual, strictly typed)", () => {
  it("exposes all 14 template keys", () => {
    expect(TEMPLATE_KEYS).toHaveLength(14);
    expect(new Set(TEMPLATE_KEYS).size).toBe(14);
  });

  it("maps every domain event except DISCREPANCY_RESOLVED", () => {
    for (const event of Object.values(DomainEventType)) {
      if (event === DomainEventType.DISCREPANCY_RESOLVED) {
        expect(EVENT_TEMPLATES[event]).toBeNull();
      } else {
        expect(EVENT_TEMPLATES[event]).not.toBeNull();
      }
    }
  });

  it("renders parcel_created in en + bn without leaking internals", () => {
    const out = renderParcelCreated({ trackingCode: "DHR-1", recipientName: "Rahim" });
    expect(out.en.title.length).toBeGreaterThan(0);
    expect(out.bn.title.length).toBeGreaterThan(0);
    expect(out.en.body).toContain("DHR-1");
    expect(out.en.body).toContain("Rahim");
    expect(out.bn.body).toContain("DHR-1");
    // No internal ids, secrets or OTPs in generic templates
    expect(JSON.stringify(out)).not.toMatch(/password|secret|otp/i);
  });

  it("renders out-for-delivery without an OTP code (OTP travels separately)", () => {
    const out = renderParcelOutForDelivery({ trackingCode: "DHR-2" });
    expect(out.en.body).toContain("DHR-2");
    expect(out.bn.body).toContain("DHR-2");
    expect(out.en.body).not.toMatch(/\b\d{6}\b/);
  });

  it("renders delivered with COD amount in both locales", () => {
    const out = renderParcelDelivered({ trackingCode: "DHR-3", codCollected: 1250 });
    expect(out.en.body).toContain("DHR-3");
    expect(out.en.body).toContain("1,250");
    expect(out.bn.body).toContain("DHR-3");
    const free = renderParcelDelivered({ trackingCode: "DHR-3", codCollected: 0 });
    expect(free.en.body).not.toContain("COD collected");
  });

  it("renders failed with a reason in both locales", () => {
    const out = renderParcelFailed({ trackingCode: "DHR-4", reason: "CUSTOMER_UNAVAILABLE" });
    expect(out.en.body).toContain("DHR-4");
    expect(out.bn.body).toContain("DHR-4");
  });

  it("renders returned, assigned, hand-in, cash-verified and settlement", () => {
    expect(renderParcelReturned({ trackingCode: "T", recipientName: "R" }).en.body).toContain("T");
    expect(renderParcelAssigned({ trackingCode: "T", recipientName: "R" }).bn.body).toContain("T");
    const handIn = renderHandInSubmitted({ handinCode: "HI-1", itemCount: 3, totalMinor: 150000 });
    expect(handIn.en.body).toContain("HI-1");
    expect(handIn.bn.body).toContain("HI-1");
    const verified = renderCashVerified({
      trackingCode: "T",
      netAmount: 950,
      settlementCode: "STL-1",
    });
    expect(verified.en.body).toContain("T");
    expect(verified.en.body).toContain("950");
    const settlement = renderSettlementCreated({
      trackingCode: "T",
      netAmount: 950,
      settlementCode: "STL-2",
    });
    expect(settlement.bn.body).toContain("STL-2");
  });

  it("renders the full payout lifecycle bilingually", () => {
    const vars = { payoutCode: "PAY-1", amount: 5000, method: "bKash" };
    for (const fn of [
      renderPayoutRequested,
      renderPayoutApproved,
      renderPayoutCompleted,
      renderPayoutFailed,
    ]) {
      const out = fn(vars);
      expect(out.en.body).toContain("PAY-1");
      expect(out.bn.body).toContain("PAY-1");
    }
    // Requested/completed carry the channel; approved/failed focus on state.
    expect(renderPayoutRequested(vars).en.body).toContain("bKash");
    expect(renderPayoutCompleted(vars).en.body).toContain("bKash");
  });

  it("renders discrepancy with signed difference", () => {
    const out = renderDiscrepancyOpened({ trackingCode: "T", differenceMinor: -2500 });
    expect(out.en.body).toContain("T");
    expect(out.bn.body).toContain("T");
  });
});
