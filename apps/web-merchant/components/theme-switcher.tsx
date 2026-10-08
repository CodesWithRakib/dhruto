"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dhruto/ui";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
          aria-label="Toggle theme"
        >
          <Palette className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 p-1.5 rounded-xl border border-border bg-surface">
        <DropdownMenuItem
          onClick={() => setTheme("green")}
          className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-surface-muted transition-colors flex items-center justify-between"
        >
          Deep Forest
          {theme === "green" && <span className="h-2 w-2 rounded-full bg-[#0F5132]" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("red")}
          className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-surface-muted transition-colors flex items-center justify-between"
        >
          Ruby Red
          {theme === "red" && <span className="h-2 w-2 rounded-full bg-[#E11D48]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
