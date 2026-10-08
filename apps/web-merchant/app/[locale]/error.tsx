"use client";

import React from "react";
import { ErrorState, RetryButton } from "@/components/feedback/states";

/**
 * Locale route-segment boundary: one broken widget or section shows a
 * recoverable error instead of unmounting the whole page. Bilingual-inline
 * copy (like not-found) so it renders even if translations failed to load.
 */
export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <ErrorState
          title="Something went wrong · কিছু ভুল হয়েছে"
          description="This section could not be loaded. Your data is safe — try again."
          action={
            <RetryButton label="Try again · আবার চেষ্টা করুন" onRetry={() => reset()} />
          }
        />
      </div>
    </div>
  );
}
