import React from "react";
import { Link } from "@/lib/navigation";
import { Button } from "@dhruto/ui";
import { NotFoundState } from "@/components/feedback/states";

/**
 * Locale-scoped 404. Uses the shared feedback system so it matches every other
 * empty/error surface in the product. Text is intentionally bilingual-inline
 * so it renders even if the i18n provider is unavailable.
 */
export default function LocaleNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <NotFoundState
          title="Page not found · পৃষ্ঠা খুঁজে পাওয়া যায়নি"
          description="The page you were looking for does not exist or has moved."
          action={
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm">
                  Back to home
                </Button>
              </Link>
              <Link href="/track">
                <Button size="sm">Track a parcel</Button>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
