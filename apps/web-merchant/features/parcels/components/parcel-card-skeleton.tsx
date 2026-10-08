"use client";

import * as React from "react";

/**
 * Loading placeholder for the mobile shipment card. Mirrors the real card's
 * block structure (identifier + status, customer, destination, money row,
 * actions) so the list does not jump when data lands.
 */
export function ParcelCardSkeleton() {
  return (
    <li className="rounded-md border border-border bg-surface p-4" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="dhruto-skeleton h-4 w-40 rounded-md" />
        <div className="dhruto-skeleton h-5 w-20 rounded-md" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="dhruto-skeleton h-4 w-32 rounded-md" />
        <div className="dhruto-skeleton h-3 w-48 rounded-md" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="dhruto-skeleton h-8 w-20 rounded-md" />
        <div className="dhruto-skeleton h-8 w-16 rounded-md" />
      </div>
      <div className="dhruto-skeleton mt-3 h-9 w-full rounded-md" />
    </li>
  );
}

export function ParcelCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-3" role="status" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <ParcelCardSkeleton key={index} />
      ))}
    </ul>
  );
}
