"use client";

import React, { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store";
import { Toaster } from "@dhruto/ui";

/**
 * App-wide client providers. The product ships a single theme whose colors
 * live in `@dhruto/ui/styles/tokens.css`, so no theme provider is needed.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      {children}
      <Toaster />
    </Provider>
  );
}
