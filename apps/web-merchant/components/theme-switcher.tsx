"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("sw h-[30px] w-20 opacity-0", className)} aria-hidden="true" />;
  }

  const currentTheme = theme || "purple";

  return (
    <div
      className={cn("sw items-center", className)}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        data-color="purple"
        style={{ "--a": "#e6c2f7", "--b": "#8d46c4" } as React.CSSProperties}
        aria-label="Royal Purple theme"
        aria-pressed={currentTheme === "purple"}
        onClick={() => setTheme("purple")}
        className={cn(currentTheme === "purple" && "shadow-[0_0_0_2px_var(--dk),0_0_0_3.5px_#fff]")}
      />
      <button
        type="button"
        data-color="green"
        style={{ "--a": "#bff56a", "--b": "#1f9a5f" } as React.CSSProperties}
        aria-label="Emerald Green theme"
        aria-pressed={currentTheme === "green"}
        onClick={() => setTheme("green")}
        className={cn(currentTheme === "green" && "shadow-[0_0_0_2px_var(--dk),0_0_0_3.5px_#fff]")}
      />
      <button
        type="button"
        data-color="red"
        style={{ "--a": "#fecdd3", "--b": "#e11d48" } as React.CSSProperties}
        aria-label="Ruby Red theme"
        aria-pressed={currentTheme === "red"}
        onClick={() => setTheme("red")}
        className={cn(currentTheme === "red" && "shadow-[0_0_0_2px_var(--dk),0_0_0_3.5px_#fff]")}
      />
    </div>
  );
}
