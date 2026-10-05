"use client";

import * as React from "react";

/**
 * Registers the Dhruto service worker after the page becomes interactive.
 *
 * Kept out of the critical path (idle callback) and disabled in development so
 * the dev server's HMR is never served from cache.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure must never break the app; ignore silently.
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(register);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(register, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
