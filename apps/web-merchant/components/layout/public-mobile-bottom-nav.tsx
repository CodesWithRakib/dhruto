"use client";

import { Home, Search, DollarSign, Layers, LogIn, LayoutDashboard } from "lucide-react";
import { Link, usePathname } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { homeForRole } from "@/config/roles";
import { cn } from "@/lib/cn";

export function PublicMobileBottomNav() {
  // const t = useTranslations("Nav");
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const publicItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/track", label: "Track", icon: Search },
    { href: "/pricing", label: "Pricing", icon: DollarSign },
    { href: "/services", label: "Services", icon: Layers },
  ];

  const destinationHref = isAuthenticated && user ? homeForRole(user.role).href : "/login";
  const destinationLabel = isAuthenticated ? "Dashboard" : "Sign In";
  const DestinationIcon = isAuthenticated ? LayoutDashboard : LogIn;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe md:hidden "
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {publicItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-caption font-medium transition-colors",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground active:text-primary",
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="truncate text-[11px] leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <Link
            href={destinationHref}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-caption font-medium transition-colors",
              pathname.startsWith("/login") || pathname.includes("/dashboard")
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground active:text-primary",
            )}
          >
            <DestinationIcon className="h-5 w-5" aria-hidden="true" />
            <span className="truncate text-[11px] leading-none">{destinationLabel}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
