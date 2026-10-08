"use client";

import { Home, Search, DollarSign, Layers, LogIn, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { homeForRole } from "@/config/roles";
import { cn } from "@/lib/cn";

export function PublicMobileBottomNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const publicItems = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/track", label: t("tracking"), icon: Search },
    { href: "/pricing", label: t("pricing"), icon: DollarSign },
    { href: "/services", label: t("services"), icon: Layers },
  ];

  const destinationHref = isAuthenticated && user ? homeForRole(user.role).href : "/login";
  const destinationLabel = isAuthenticated ? t("dashboard") : t("signIn");
  const DestinationIcon = isAuthenticated ? LayoutDashboard : LogIn;

  return (
    <nav
      aria-label={t("primaryLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-surface/85 backdrop-blur-2xl pb-safe md:hidden shadow-2xl"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1">
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
                  "flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-caption font-medium transition-all duration-200",
                  active
                    ? "text-primary font-bold bg-primary/10"
                    : "text-muted-foreground hover:text-foreground active:text-primary",
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary shadow-sm shadow-primary" />
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
              "flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-caption font-medium transition-all duration-200",
              pathname.startsWith("/login") || pathname.includes("/dashboard")
                ? "text-primary font-bold bg-primary/10"
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
