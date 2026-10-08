import { beforeEach, describe, expect, it } from "vitest";
import { lastListUrl, rememberListUrl } from "../../lib/last-list-url";

const BASE = "/merchant/parcels";

describe("last-list-url", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("falls back to the list root when nothing was remembered", () => {
    expect(lastListUrl(BASE, BASE)).toBe(BASE);
  });

  it("restores the stored query string for the same list", () => {
    // Simulate being on /en/merchant/parcels?status=CREATED&page=3.
    Object.defineProperty(window, "location", {
      writable: true,
      value: { search: "?status=CREATED&page=3" } as Location,
    });
    rememberListUrl(BASE);
    expect(lastListUrl(BASE, BASE)).toBe(`${BASE}?status=CREATED&page=3`);
  });

  it("never leaks one namespace into another", () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { search: "?status=CREATED" } as Location,
    });
    rememberListUrl("/admin/parcels");
    expect(lastListUrl(BASE, BASE)).toBe(BASE);
  });

  it("falls back when storage holds garbage", () => {
    sessionStorage.setItem("dhruto:lastParcelListUrl", "not-json{{{");
    expect(lastListUrl(BASE, BASE)).toBe(BASE);
  });
});
