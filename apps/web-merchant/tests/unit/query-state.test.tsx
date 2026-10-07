import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";

/**
 * URL state is the source of truth for list pages, so these tests pin the
 * parsing defaults, the "preserve unrelated params" rule and the automatic
 * pagination reset that every list relies on.
 */
const hoisted = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => hoisted.params,
  usePathname: () => "/en/parcels",
}));

vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ replace: hoisted.replace, push: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/en/parcels",
  redirect: vi.fn(),
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

import { useQueryState, type QueryStateApi } from "../../hooks/use-query-state";

let api: QueryStateApi;

function Harness() {
  api = useQueryState();
  return null;
}

function mount(search = "") {
  hoisted.params = new URLSearchParams(search);
  hoisted.replace.mockClear();
  render(<Harness />);
  return api;
}

/** The last URL the hook asked the router to replace. */
function lastUrl(): string {
  const calls = hoisted.replace.mock.calls;
  return String(calls[calls.length - 1]?.[0] ?? "");
}

describe("useQueryState", () => {
  beforeEach(() => {
    hoisted.replace.mockClear();
  });

  it("parses typed values with sane fallbacks", () => {
    const query = mount("search=rakib&page=3&active=true&tags=a,b,status&broken=abc");

    expect(query.getString("search")).toBe("rakib");
    expect(query.getString("missing", "fallback")).toBe("fallback");
    expect(query.getNumber("page")).toBe(3);
    // An unparsable number must not leak NaN into an API request.
    expect(query.getNumber("broken", 1)).toBe(1);
    expect(query.getBoolean("active")).toBe(true);
    expect(query.getArray("tags")).toEqual(["a", "b", "status"]);
    expect(query.getArray("missing")).toEqual([]);
  });

  it("preserves unrelated params, drops page by default and removes empty values", () => {
    const query = mount("page=4&status=pending&district=Dhaka");

    act(() => query.set({ search: "rakib" }));

    const url = lastUrl();
    expect(url).toContain("search=rakib");
    expect(url).toContain("status=pending");
    expect(url).toContain("district=Dhaka");
    // New search criteria invalidate the old offset.
    expect(url).not.toContain("page=");
  });

  it("keeps the page when the caller opts out of the reset", () => {
    const query = mount("page=2&status=pending");

    act(() => query.set({ page: 3 }, { resetPageKeys: [] }));

    const url = lastUrl();
    expect(url).toContain("page=3");
    expect(url).toContain("status=pending");
  });

  it("deletes a filter when it is set to null or an empty string", () => {
    const query = mount("search=rakib&status=pending");

    act(() => query.set({ search: null, status: "" }));

    const url = lastUrl();
    expect(url).not.toContain("search=");
    expect(url).not.toContain("status=");
  });

  it("resets exactly the requested keys and keeps the rest", () => {
    const query = mount("search=rakib&status=pending&district=Dhaka&page=2");

    act(() => query.reset(["search", "status"]));

    const url = lastUrl();
    expect(url).not.toContain("search=");
    expect(url).not.toContain("status=");
    expect(url).toContain("district=Dhaka");
    expect(url).toContain("page=2");
  });

  it("removes named keys", () => {
    const query = mount("search=rakib&status=pending");

    act(() => query.remove("status"));

    expect(lastUrl()).not.toContain("status=");
    expect(lastUrl()).toContain("search=rakib");
  });

  it("serialises array params as a comma list and skips empty arrays", () => {
    const query = mount("status=pending");

    act(() => query.set({ hubs: ["dhk-1", "dhk-2"], riders: [] }));

    const url = lastUrl();
    expect(url).toContain("hubs=dhk-1%2Cdhk-2");
    expect(url).not.toContain("riders=");
  });
});
