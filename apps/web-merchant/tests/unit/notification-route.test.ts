import { describe, expect, it } from "vitest";
import { resolveNotificationRoute } from "@/features/notifications/lib/notification-route";

describe("resolveNotificationRoute", () => {
  it("allows known in-app role areas", () => {
    expect(resolveNotificationRoute({ route: "/customer/track/DHR-20261119-QRW7ZF" })).toBe(
      "/customer/track/DHR-20261119-QRW7ZF",
    );
    expect(resolveNotificationRoute({ route: "/hub/manifests/abc" })).toBe("/hub/manifests/abc");
    expect(resolveNotificationRoute({ route: "/merchant/parcels" })).toBe("/merchant/parcels");
  });

  it("rejects external, protocol-relative and unknown destinations", () => {
    expect(resolveNotificationRoute({ route: "https://evil.example/phish" })).toBeNull();
    expect(resolveNotificationRoute({ route: "//evil.example" })).toBeNull();
    expect(resolveNotificationRoute({ route: "/api/v1/auth/logout" })).toBeNull();
    expect(resolveNotificationRoute({ route: 42 })).toBeNull();
    expect(resolveNotificationRoute(undefined)).toBeNull();
  });
});
