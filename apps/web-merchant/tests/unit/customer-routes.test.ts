import { describe, expect, it } from "vitest";
import { CUSTOMER_ROUTES, isProtectedRoute, isActiveRoute } from "../../config/routes";
import { navForRole, bottomNavForRole } from "../../config/navigation";
import { canAccessSection, homeForRole, roleConfigFor } from "../../config/roles";

describe("Customer portal routing & navigation", () => {
  it("declares all customer surface routes", () => {
    expect(CUSTOMER_ROUTES.dashboard).toBe("/customer/dashboard");
    expect(CUSTOMER_ROUTES.tracking).toBe("/customer/track");
    expect(CUSTOMER_ROUTES.trackShipment("DHR-123")).toBe("/customer/track/DHR-123");
    expect(CUSTOMER_ROUTES.history).toBe("/customer/history");
    expect(CUSTOMER_ROUTES.settings).toBe("/customer/settings");
  });

  it("protects customer surfaces behind authentication", () => {
    expect(isProtectedRoute("/en/customer/dashboard")).toBe(true);
    expect(isProtectedRoute("/en/customer/track")).toBe(true);
    expect(isProtectedRoute("/en/customer/history")).toBe(true);
    expect(isProtectedRoute("/en/customer/settings")).toBe(true);
    expect(isProtectedRoute("/en/track")).toBe(false);
  });

  it("configures customer role permissions and home surface", () => {
    expect(homeForRole("CUSTOMER").href).toBe("/customer/dashboard");
    expect(roleConfigFor("CUSTOMER").section).toBe("customer");
    expect(canAccessSection("CUSTOMER", "customer")).toBe(true);
    expect(canAccessSection("CUSTOMER", "public")).toBe(true);
    expect(canAccessSection("CUSTOMER", "merchant")).toBe(false);
    expect(canAccessSection("CUSTOMER", "admin")).toBe(false);
  });

  it("provides customer sidebar and mobile bottom navigation", () => {
    const navGroups = navForRole("CUSTOMER");
    expect(navGroups.length).toBeGreaterThan(0);

    const hrefs = navGroups.flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs).toContain(CUSTOMER_ROUTES.dashboard);
    expect(hrefs).toContain(CUSTOMER_ROUTES.tracking);
    expect(hrefs).toContain(CUSTOMER_ROUTES.history);
    expect(hrefs).toContain(CUSTOMER_ROUTES.settings);

    const bottomItems = bottomNavForRole("CUSTOMER");
    expect(bottomItems.map((item) => item.href)).toEqual([
      CUSTOMER_ROUTES.dashboard,
      CUSTOMER_ROUTES.tracking,
      CUSTOMER_ROUTES.history,
      CUSTOMER_ROUTES.settings,
    ]);
  });

  it("accurately detects active customer routes", () => {
    expect(isActiveRoute("/en/customer/dashboard", CUSTOMER_ROUTES.dashboard)).toBe(true);
    expect(isActiveRoute("/en/customer/track", CUSTOMER_ROUTES.tracking)).toBe(true);
    expect(isActiveRoute("/en/customer/history", CUSTOMER_ROUTES.dashboard)).toBe(false);
  });
});
