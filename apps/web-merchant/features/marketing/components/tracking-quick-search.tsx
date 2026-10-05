"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@dhruto/ui";
import { useRouter } from "@/lib/navigation";

export function TrackingQuickSearch() {
  const t = useTranslations("Tracking");
  const router = useRouter();
  const [code, setCode] = React.useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = code.trim();
    if (clean) router.push(`/track/${encodeURIComponent(clean)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex w-full flex-col gap-2 sm:flex-row"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          name="trackingCode"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={t("inputPlaceholder")}
          aria-label={t("searchTitle")}
          autoComplete="off"
          className="pl-9 font-mono uppercase"
        />
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        <Search className="h-4 w-4" aria-hidden="true" />
        {t("trackBtn")}
      </Button>
    </form>
  );
}
