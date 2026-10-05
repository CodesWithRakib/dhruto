import React from "react";
import { Skeleton } from "@dhruto/ui";

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      
      {/* Table Skeleton */}
      <div className="pt-8 space-y-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
