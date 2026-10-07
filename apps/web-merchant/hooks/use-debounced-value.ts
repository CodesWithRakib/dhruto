"use client";

import * as React from "react";

/**
 * Shared debounce hook — the single debounce implementation for the app.
 * Returns the value delayed by `delayMs` after the last change, so list
 * pages never fire an API request per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
