import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { baseQueryWithReauth } from "../../lib/api/base-api";
import { makeStore, type AppStore } from "../../store";
import { setCredentials } from "../../store/auth.slice";
import { installLocalStorageMock } from "./storage-mock";

installLocalStorageMock();

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Minimal api stub: signal stays undefined so undici never sees a foreign AbortSignal. */
function apiFor(store: AppStore): BaseQueryApi {
  return {
    signal: undefined as unknown as AbortSignal,
    dispatch: store.dispatch,
    getState: () => store.getState(),
    endpoint: "probe",
    type: "query",
    extra: undefined,
    requestId: "test-request",
    abort: () => {},
  } as BaseQueryApi;
}

describe("baseQueryWithReauth", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = realFetch;
    localStorage.clear();
  });

  function seedSession() {
    const store = makeStore();
    store.dispatch(
      setCredentials({
        user: {
          id: "u-1",
          email: "m@dhruto.com",
          name: "Merchant",
          phone: "01700000000",
          role: "MERCHANT",
        },
        accessToken: "expired-access",
        refreshToken: "valid-refresh",
      }),
    );
    return store;
  }

  it("refreshes once and retries the original query after a 401", async () => {
    const store = seedSession();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse(
          { success: true, data: { accessToken: "fresh-access", refreshToken: "fresh-refresh" } },
          200,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }, 200));
    vi.stubGlobal("fetch", fetchMock);

    const result = await baseQueryWithReauth("/probe", apiFor(store), {});

    expect(result.data).toEqual({ data: { ok: true } });
    expect(store.getState().auth.accessToken).toBe("fresh-access");
    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      (input as Request).url.endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("shares a single refresh across concurrent 401s", async () => {
    const store = seedSession();
    let calls = 0;
    const fetchMock = vi.fn().mockImplementation(async (input: Request) => {
      calls += 1;
      if (input.url.endsWith("/auth/refresh")) {
        // Small delay so both probes observe the in-flight refresh.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return jsonResponse(
          { success: true, data: { accessToken: "fresh-access", refreshToken: "fresh-refresh" } },
          200,
        );
      }
      if (calls <= 2) return jsonResponse({ message: "expired" }, 401);
      return jsonResponse({ data: { ok: true } }, 200);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      baseQueryWithReauth("/probe", apiFor(store), {}),
      baseQueryWithReauth("/probe", apiFor(store), {}),
    ]);

    expect(first.data ?? second.data).toBeTruthy();
    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      (input as Request).url.endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("expires the session when refresh fails", async () => {
    const store = seedSession();
    // jsdom default URL is unprotected, so no navigation is attempted; the
    // state cleanup is what matters here.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "invalid refresh" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const result = await baseQueryWithReauth("/probe", apiFor(store), {});

    expect(result.error).toBeTruthy();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.accessToken).toBeNull();
  });

  it("never attempts refresh for auth endpoints", async () => {
    const store = seedSession();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ message: "bad" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const result = await baseQueryWithReauth(
      { url: "/auth/login", method: "POST", body: { emailOrPhone: "x", password: "y" } },
      apiFor(store),
      {},
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error).toBeTruthy();
    // The stored session is untouched: a wrong password must not log the
    // user out.
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });
});
