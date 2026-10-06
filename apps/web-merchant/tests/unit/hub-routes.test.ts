import { describe, expect, it } from "vitest";
import {
  HUB_ROUTES,
  PROTECTED_PREFIXES,
  isActiveRoute,
  isProtectedRoute,
} from "../../config/routes";
import { bottomNavForRole, navForRole } from "../../config/navigation";
import { canAccessSection } from "../../config/roles";

describe("Hub routing", () => {
  it("declares every Phase 2 hub surface", () => {
    expect(HUB_ROUTES.dashboard).toBe("/hub/dashboard");
    expect(HUB_ROUTES.scanner).toBe("/hub/scanner");
    expect(HUB_ROUTES.parcels).toBe("/hub/parcels");
    expect(HUB_ROUTES.bags).toBe("/hub/bags");
    expect(HUB_ROUTES.bag("abc")).toBe("/hub/bags/abc");
    expect(HUB_ROUTES.manifests).toBe("/hub/manifests");
    expect(HUB_ROUTES.manifest("abc")).toBe("/hub/manifests/abc");
    expect(HUB_ROUTES.exceptions).toBe("/hub/exceptions");
  });

  it("protects hub routes behind authentication", () => {
    expect(PROTECTED_PREFIXES).toContain("/hub");
    expect(isProtectedRoute("/en/hub/dashboard")).toBe(true);
    expect(isProtectedRoute("/en/hub/bags/some-id")).toBe(true);
  });

  it("keeps detail pages highlighted under their list route", () => {
    expect(isActiveRoute("/en/hub/bags", HUB_ROUTES.bags)).toBe(true);
    expect(isActiveRoute("/en/hub/bags/some-id", HUB_ROUTES.bags)).toBe(true);
    expect(isActiveRoute("/en/hub/manifests/some-id", HUB_ROUTES.manifests)).toBe(true);
    expect(isActiveRoute("/en/hub/scanner", HUB_ROUTES.bags)).toBe(false);
  });

  it("gives hub managers scanner, bags and manifests in nav and bottom bar", () => {
    const hrefs = navForRole("HUB_MANAGER").flatMap((group) =>
      group.items.map((item) => item.href),
    );
    for (const href of [
      HUB_ROUTES.dashboard,
      HUB_ROUTES.scanner,
      HUB_ROUTES.parcels,
      HUB_ROUTES.bags,
      HUB_ROUTES.manifests,
    ]) {
      expect(hrefs).toContain(href);
    }

    const bottomHrefs = bottomNavForRole("HUB_MANAGER").map((item) => item.href);
    expect(bottomHrefs).toContain(HUB_ROUTES.dashboard);
    expect(bottomHrefs).toContain(HUB_ROUTES.scanner);
    expect(bottomHrefs).toContain(HUB_ROUTES.bags);
    expect(bottomHrefs).toContain(HUB_ROUTES.manifests);
  });

  it("restricts the hub section to hub operators and admins", () => {
    expect(canAccessSection("HUB_MANAGER", "hub")).toBe(true);
    expect(canAccessSection("ADMIN", "hub")).toBe(true);
    expect(canAccessSection("MERCHANT", "hub")).toBe(false);
    expect(canAccessSection("RIDER", "hub")).toBe(false);
  });
});
