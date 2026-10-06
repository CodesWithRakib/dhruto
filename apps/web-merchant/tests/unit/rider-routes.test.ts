import { describe, expect, it } from "vitest";
import {
  RIDER_ROUTES,
  PROTECTED_PREFIXES,
  isActiveRoute,
  isProtectedRoute,
} from "../../config/routes";
import { bottomNavForRole, navForRole } from "../../config/navigation";
import { canAccessSection } from "../../config/roles";

describe("Rider routing", () => {
  it("declares every Phase 3 rider surface", () => {
    expect(RIDER_ROUTES.dashboard).toBe("/rider/dashboard");
    expect(RIDER_ROUTES.tasks).toBe("/rider/tasks");
    expect(RIDER_ROUTES.task("abc")).toBe("/rider/tasks/abc");
    expect(RIDER_ROUTES.history).toBe("/rider/history");
    expect(RIDER_ROUTES.profile).toBe("/rider/profile");
  });

  it("protects rider routes behind authentication", () => {
    expect(PROTECTED_PREFIXES).toContain("/rider");
    expect(isProtectedRoute("/en/rider/dashboard")).toBe(true);
    expect(isProtectedRoute("/en/rider/tasks/some-id")).toBe(true);
  });

  it("keeps task details highlighted under the tasks route", () => {
    expect(isActiveRoute("/en/rider/tasks", RIDER_ROUTES.tasks)).toBe(true);
    expect(isActiveRoute("/en/rider/tasks/some-id", RIDER_ROUTES.tasks)).toBe(true);
    expect(isActiveRoute("/en/rider/history", RIDER_ROUTES.tasks)).toBe(false);
  });

  it("gives riders dashboard, tasks, history and profile in nav and bottom bar", () => {
    const hrefs = navForRole("RIDER").flatMap((group) =>
      group.items.map((item) => item.href),
    );
    for (const href of [
      RIDER_ROUTES.dashboard,
      RIDER_ROUTES.tasks,
      RIDER_ROUTES.history,
      RIDER_ROUTES.profile,
    ]) {
      expect(hrefs).toContain(href);
    }

    const bottomHrefs = bottomNavForRole("RIDER").map((item) => item.href);
    expect(bottomHrefs).toContain(RIDER_ROUTES.dashboard);
    expect(bottomHrefs).toContain(RIDER_ROUTES.tasks);
    expect(bottomHrefs).toContain(RIDER_ROUTES.history);
    expect(bottomHrefs).toContain(RIDER_ROUTES.profile);
  });

  it("restricts the rider section to riders and admins", () => {
    expect(canAccessSection("RIDER", "rider")).toBe(true);
    expect(canAccessSection("ADMIN", "rider")).toBe(true);
    expect(canAccessSection("MERCHANT", "rider")).toBe(false);
    expect(canAccessSection("HUB_MANAGER", "rider")).toBe(false);
  });
});
