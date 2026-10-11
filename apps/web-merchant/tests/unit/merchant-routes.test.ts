import { describe, expect, it } from "vitest";
import {
  MERCHANT_ROUTES,
  PUBLIC_ROUTES,
  ADMIN_ROUTES,
  PROTECTED_PREFIXES,
  isActiveRoute,
  isProtectedRoute,
} from "../../config/routes";
import { navForRole } from "../../config/navigation";

describe("Merchant & Public routing", () => {
  it("declares all public and merchant surfaces", () => {
    expect(PUBLIC_ROUTES.status).toBe("/status");
    expect(PUBLIC_ROUTES.pricing).toBe("/pricing");
    expect(PUBLIC_ROUTES.services).toBe("/services");
    expect(PUBLIC_ROUTES.tracking).toBe("/track");

    expect(MERCHANT_ROUTES.dashboard).toBe("/merchant/dashboard");
    expect(MERCHANT_ROUTES.calculator).toBe("/merchant/calculator");
    expect(MERCHANT_ROUTES.returns).toBe("/merchant/returns");
    expect(MERCHANT_ROUTES.apiKeys).toBe("/merchant/developer/api-keys");
    expect(MERCHANT_ROUTES.webhooks).toBe("/merchant/developer/webhooks");
    expect(MERCHANT_ROUTES.settings).toBe("/merchant/settings");
    expect(ADMIN_ROUTES.integrations).toBe("/admin/integrations");
    expect(ADMIN_ROUTES.intelligence).toBe("/admin/intelligence");
  });

  it("protects merchant developer surfaces and settings behind authentication", () => {
    expect(PROTECTED_PREFIXES).toContain("/merchant");
    expect(isProtectedRoute("/en/merchant/calculator")).toBe(true);
    expect(isProtectedRoute("/en/merchant/returns")).toBe(true);
    expect(isProtectedRoute("/en/merchant/developer/api-keys")).toBe(true);
    expect(isProtectedRoute("/en/merchant/settings")).toBe(true);
    expect(isProtectedRoute("/en/status")).toBe(false);
  });

  it("keeps merchant navigation intact with calculator, returns, integrations and settings", () => {
    const hrefs = navForRole("MERCHANT").flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs).toContain(MERCHANT_ROUTES.dashboard);
    expect(hrefs).toContain(MERCHANT_ROUTES.calculator);
    expect(hrefs).toContain(MERCHANT_ROUTES.returns);
    expect(hrefs).toContain(MERCHANT_ROUTES.webhooks);
    expect(hrefs).toContain(MERCHANT_ROUTES.settings);
  });

  it("highlights active merchant routes accurately", () => {
    expect(isActiveRoute("/en/merchant/calculator", MERCHANT_ROUTES.calculator)).toBe(true);
    expect(isActiveRoute("/en/merchant/returns", MERCHANT_ROUTES.returns)).toBe(true);
    expect(isActiveRoute("/en/merchant/dashboard", MERCHANT_ROUTES.calculator)).toBe(false);
  });
});
