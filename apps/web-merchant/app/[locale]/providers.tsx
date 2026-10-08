"use client";

import React, { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store";
import { Toaster } from "@dhruto/ui";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      <ThemeProvider attribute="data-theme" defaultTheme="green" themes={["green", "red"]}>
        {children}
        <Toaster />
      </ThemeProvider>
    </Provider>
  );
}
