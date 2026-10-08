import {
  createApi,
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { getStoredAccessToken, getStoredRefreshToken } from "./auth-token";
import { logout, setCredentials, type UserProfile } from "../../store/auth.slice";

/**
 * Structural view of the slice the API client needs.
 *
 * Declared locally (instead of importing `RootState`) because the store imports
 * this module — a real type import here would be a circular dependency.
 */
interface ApiAuthState {
  auth?: {
    accessToken?: string | null;
    refreshToken?: string | null;
    user?: UserProfile | null;
  };
}

const getBaseUrl = (): string => {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://localhost:4000/api/v1";
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders: (headers, { getState }) => {
    headers.set("Content-Type", "application/json");

    // Retrieve auth token from state or storage (single helper everywhere).
    const state = getState() as ApiAuthState;
    const token = state?.auth?.accessToken || getStoredAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

/** Auth endpoints manage their own failures — never refresh-loop on them. */
function isAuthEndpoint(args: string | FetchArgs): boolean {
  const url = typeof args === "string" ? args : (args.url ?? "");
  return url.startsWith("/auth/");
}

interface RefreshTokenPair {
  accessToken?: string;
  refreshToken?: string;
}

interface RefreshResponse {
  success: boolean;
  data?: RefreshTokenPair;
  tokens?: RefreshTokenPair;
}

/**
 * Single-flight refresh: concurrent 401s share one `POST /auth/refresh`
 * instead of stampeding the auth service. Resolves true when fresh tokens
 * were persisted, false otherwise (caller then expires the session).
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(api: BaseQueryApi): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh(api).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function runRefresh(api: BaseQueryApi): Promise<boolean> {
  const state = api.getState() as ApiAuthState;
  const user = state?.auth?.user ?? null;
  const refreshToken = state?.auth?.refreshToken || getStoredRefreshToken();
  if (!user || !refreshToken) return false;

  const result = await rawBaseQuery(
    { url: "/auth/refresh", method: "POST", body: { refreshToken } },
    api,
    {},
  );
  const pair =
    (result.data as RefreshResponse | undefined)?.data ??
    (result.data as RefreshResponse | undefined)?.tokens;
  const accessToken = pair?.accessToken;
  const nextRefreshToken = pair?.refreshToken;
  if (result.error || !accessToken || !nextRefreshToken) return false;

  api.dispatch(setCredentials({ user, accessToken, refreshToken: nextRefreshToken }));
  return true;
}

/** Protected consoles bounce to login; public pages handle their own errors. */
function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (!/\/(merchant|admin|hub|rider)(\/|$)/.test(path)) return;
  const locale = path.match(/^\/(en|bn)(?=\/|$)/)?.[1] ?? "en";
  // Full reload (not router.push): the session is dead, so every in-memory
  // credential, poller and subscription must die with it. Unavailable here
  // anyway — baseQuery has no component/router context.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/${locale}/login`);
}

function expireSession(api: BaseQueryApi): void {
  api.dispatch(logout());
  api.dispatch(baseApi.util.resetApiState());
  redirectToLogin();
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (!result.error || result.error.status !== 401 || isAuthEndpoint(args)) {
    return result;
  }
  // The retry below uses the raw query (not this wrapper), so a second 401
  // can never recurse — worst case it surfaces as a normal error.
  const refreshed = await refreshAccessToken(api);
  if (refreshed) {
    return rawBaseQuery(args, api, extraOptions);
  }
  expireSession(api);
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Parcel",
    "Merchant",
    "Wallet",
    "Auth",
    "Notification",
    "Webhook",
    "Hub",
    "Rider",
    "Finance",
    "Integration",
    "Intelligence",
    "Analytics",
  ],
  endpoints: () => ({}),
});

/**
 * Test seam: unit tests invoke the reauth wrapper directly with a minimal
 * api stub (store dispatches hit a jsdom/undici AbortSignal interop gap in
 * this repo's test env). Production code always goes through `baseApi`.
 */
export { baseQueryWithReauth };
