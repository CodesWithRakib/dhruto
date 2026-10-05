import React from "react";
import { Link } from "@/lib/navigation";
import { Logo } from "@dhruto/ui";

/**
 * Auth surface: sign-in and registration.
 * Deliberately chrome-free — a focused, centred card with a link home.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="dhruto-container flex h-16 items-center">
        <Link href="/" aria-label="Dhruto" className="rounded-md">
          <Logo />
        </Link>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-10"
      >
        {children}
      </main>
    </div>
  );
}
