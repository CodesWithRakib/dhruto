import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";

/**
 * Phase 8 (F-UI-01): "Clear filters" must quiesce with a clean URL.
 * Regression test for the production "Maximum update depth exceeded" loop:
 * the commit effect used to write stale in-flight debounced text back into
 * a just-cleared URL, the adopt effect pulled it into the fields, and the
 * cycle repeated until React bailed out with filters visibly stuck.
 */
const hoisted = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn((url: string) => {
    const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
    hoisted.params = new URLSearchParams(q);
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => hoisted.params,
  usePathname: () => "/en/merchant/parcels",
}));

vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({
    replace: hoisted.replace,
    push: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/en/merchant/parcels",
  redirect: vi.fn(),
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

vi.mock("../../features/parcels/api/parcels.api", () => ({
  useGetParcelsQuery: () => ({ data: undefined, isLoading: false, isFetching: false, isError: false }),
}));

import { useParcelsList } from "../../features/parcels/hooks/use-parcels-list";

let api: ReturnType<typeof useParcelsList>;

function Harness() {
  api = useParcelsList();
  return null;
}

describe("useParcelsList reset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hoisted.replace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clearing filters with stale debounced text leaves a clean URL (no resurrection, no loop)", () => {
    hoisted.params = new URLSearchParams("search=ZZZNOMATCH&status=CREATED");
    render(<Harness />);
    // Let typing debounce settle as it would after real user input.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const replacesBefore = hoisted.replace.mock.calls.length;

    // A render-loop here throws Maximum update depth synchronously.
    act(() => {
      api.resetFilters();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const urls = hoisted.replace.mock.calls.map((c) => String(c[0]));
    const lastUrl = urls[urls.length - 1] ?? "";
    expect(lastUrl).not.toContain("search=");
    expect(lastUrl).not.toContain("status=");
    // Bounded navigations: the clear itself, never a storm.
    expect(urls.length - replacesBefore).toBeLessThanOrEqual(2);
  });

  it("typing still commits settled text to the URL", () => {
    hoisted.params = new URLSearchParams("");
    render(<Harness />);
    act(() => {
      api.updateFilter("search", "hello");
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const urls = hoisted.replace.mock.calls.map((c) => String(c[0]));
    expect(urls[urls.length - 1]).toContain("search=hello");
  });
});
