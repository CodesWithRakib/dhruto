"use client";

import * as React from "react";
import { baseApi } from "@/lib/api/base-api";
import { logout } from "@/store/auth.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AppDispatch } from "@/store";
import { useLogoutMutation } from "@/features/auth/api/auth.api";

/**
 * Dhruto — one sign-out path for every surface (console shell, public
 * header, mobile drawer).
 *
 * - Revokes the server session best-effort (never blocks local sign-out).
 * - Clears credentials + resets the entire RTK Query cache so the next user
 *   can never see the previous user's cached parcels, wallet or analytics.
 * - Drops the remembered list workspace (namespace-scoped, non-sensitive).
 */
export function clearLocalSession(dispatch: AppDispatch): void {
  dispatch(logout());
  dispatch(baseApi.util.resetApiState());
  try {
    sessionStorage.removeItem("dhruto:lastParcelListUrl");
  } catch {
    // Storage unavailable — nothing sensitive lives here.
  }
}

export function useSignOut(): { signOut: () => Promise<void>; isSigningOut: boolean } {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const [serverLogout, { isLoading }] = useLogoutMutation();

  const signOut = React.useCallback(async () => {
    try {
      await serverLogout({ refreshToken: refreshToken ?? undefined }).unwrap();
    } catch {
      // Backend revocation is best-effort; local cleanup always runs.
    }
    clearLocalSession(dispatch);
  }, [serverLogout, refreshToken, dispatch]);

  return { signOut, isSigningOut: isLoading };
}
