import { useState } from "react";
import { useGetParcelsQuery } from "../api/parcels.api";

export function useParcelsList() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const { data, error, isLoading, refetch } = useGetParcelsQuery({
    status: status || undefined,
    search: search || undefined,
  });

  return {
    parcels: data?.data || [],
    isLoading,
    isError: !!error,
    refetch,
    status,
    setStatus,
    search,
    setSearch,
  };
}
