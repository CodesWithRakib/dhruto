"use client";

import * as React from "react";
import { useGetHubsQuery } from "../api/hubs.api";

const STORAGE_KEY = "dhruto_active_hub";

/**
 * Active hub for the operator session.
 *
 * The selection is a UX convenience only: every backend call re-validates the
 * operator's assignment, so a tampered value can never grant Hub B access.
 */
export function useActiveHub() {
  const { data: hubsData, isLoading, isError, refetch } = useGetHubsQuery();
  const hubs = hubsData?.data ?? [];

  const [selectedHubId, setSelectedHubId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedHubId(stored);
  }, []);

  const activeHub =
    hubs.find((hub) => hub.id === selectedHubId) ?? hubs[0] ?? null;

  const setActiveHubId = React.useCallback((hubId: string) => {
    setSelectedHubId(hubId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, hubId);
    }
  }, []);

  return { hubs, activeHub, activeHubId: activeHub?.id ?? null, setActiveHubId, isLoading, isError, refetch };
}
