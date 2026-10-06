import { describe, expect, it } from "vitest";
import {
  HUB_ROUTES,
  ADMIN_ROUTES,
  MERCHANT_ROUTES,
  isProtectedRoute,
} from "../../config/routes";
import { bottomNavForRole, navForRole } from "../../config/navigation";
import { canAccessSection } from "../../config/roles";

describe("Finance routing", () => {
  it("declares the hub cash desk route", () => {
    expect(HUB_ROUTES.cash).toBe("/hub/cash");
    expect(isProtectedRoute("/en/hub/cash")).toBe(true);
  });

  it("keeps merchant, admin and hub finance surfaces in navigation", () => {
    expect(MERCHANT_ROUTES.finance).toBe("/merchant/finance");
    expect(ADMIN_ROUTES.finance).toBe("/admin/finance");

    const hubHrefs = navForRole("HUB_MANAGER").flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(hubHrefs).toContain(HUB_ROUTES.cash);

    const adminHrefs = navForRole("ADMIN").flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(adminHrefs).toContain(ADMIN_ROUTES.finance);

    expect(bottomNavForRole("MERCHANT").map((item) => item.href)).toContain(
      MERCHANT_ROUTES.finance,
    );
  });

  it("restricts finance sections by role", () => {
    expect(canAccessSection("MERCHANT", "merchant")).toBe(true);
    expect(canAccessSection("ADMIN", "admin")).toBe(true);
    expect(canAccessSection("HUB_MANAGER", "hub")).toBe(true);
    expect(canAccessSection("MERCHANT", "hub")).toBe(false);
    expect(canAccessSection("RIDER", "admin")).toBe(false);
  });
});
