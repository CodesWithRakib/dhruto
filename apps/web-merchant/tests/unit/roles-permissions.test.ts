import { describe, expect, it } from "vitest";
import { asAppRole, canAccessSection, homeForRole, roleConfigFor } from "../../config/roles";
import { isActiveRoute, isProtectedRoute, stripLocale } from "../../config/routes";

/**
 * Permission helpers are the frontend half of role isolation. These tests pin
 * the mapping so a route/config change cannot silently open (or close) a
 * section. Backend authorization remains the real boundary.
 */
describe("role isolation", () => {
  it("narrows unknown roles to MERCHANT instead of crashing", () => {
    expect(asAppRole("SUPERADMIN")).toBe("MERCHANT");
    expect(asAppRole(undefined)).toBe("MERCHANT");
    expect(asAppRole(null)).toBe("MERCHANT");
    expect(asAppRole("RIDER")).toBe("RIDER");
  });

  it("lands every role on its own home surface", () => {
    expect(homeForRole("MERCHANT").href).toContain("/merchant/");
    expect(homeForRole("ADMIN").href).toContain("/admin/");
    expect(homeForRole("HUB_MANAGER").href).toContain("/hub/");
    expect(homeForRole("RIDER").href).toContain("/rider/");
  });

  it("keeps merchants out of admin/hub/rider sections", () => {
    expect(canAccessSection("MERCHANT", "merchant")).toBe(true);
    expect(canAccessSection("MERCHANT", "admin")).toBe(false);
    expect(canAccessSection("MERCHANT", "hub")).toBe(false);
    expect(canAccessSection("MERCHANT", "rider")).toBe(false);
  });

  it("keeps riders and hub managers inside their own sections", () => {
    expect(canAccessSection("RIDER", "rider")).toBe(true);
    expect(canAccessSection("RIDER", "merchant")).toBe(false);
    expect(canAccessSection("HUB_MANAGER", "hub")).toBe(true);
    expect(canAccessSection("HUB_MANAGER", "admin")).toBe(false);
  });

  it("gives every role a translated label key", () => {
    for (const role of ["ADMIN", "MERCHANT", "HUB_MANAGER", "RIDER", "CUSTOMER", undefined]) {
      expect(roleConfigFor(role).labelKey).toMatch(/^role[A-Z]/);
    }
  });
});

describe("route guards", () => {
  it("strips the locale prefix before matching", () => {
    expect(stripLocale("/en/merchant/parcels")).toBe("/merchant/parcels");
    expect(stripLocale("/bn/track/ABC")).toBe("/track/ABC");
    expect(stripLocale("/en")).toBe("/");
  });

  it("matches nested routes but not sibling dashboards", () => {
    expect(isActiveRoute("/en/merchant/parcels/123", "/merchant/parcels")).toBe(true);
    expect(isActiveRoute("/en/merchant/finance", "/merchant/dashboard")).toBe(false);
    expect(isActiveRoute("/en/merchant/dashboard", "/merchant/dashboard")).toBe(true);
  });

  it("classifies protected consoles vs public pages", () => {
    expect(isProtectedRoute("/en/merchant/parcels")).toBe(true);
    expect(isProtectedRoute("/bn/rider/tasks")).toBe(true);
    expect(isProtectedRoute("/en/track/ABC")).toBe(false);
    expect(isProtectedRoute("/en/login")).toBe(false);
  });
});
