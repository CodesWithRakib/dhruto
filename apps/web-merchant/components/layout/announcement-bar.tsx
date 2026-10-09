"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { Link } from "@/lib/navigation";

export function AnnouncementBar() {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div className="ann" id="ann">
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Dhruto 2.0:</strong> 64 Districts Express Line-Haul &amp; Automated Next-Day COD Settlement.{" "}
          <Link href="/register" className="underline font-semibold ml-1 hover:opacity-85">
            Start Free Trial &rarr;
          </Link>
        </span>
      </div>
      <button
        type="button"
        id="annx"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
