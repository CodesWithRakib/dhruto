"use client";

import * as React from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, LanguageSwitcher, Logo } from "@dhruto/ui";
import { Link, usePathname } from "@/lib/navigation";
import { isActiveRoute } from "@/lib/nav-config";
import { homeForRole } from "@/lib/roles";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/cn";

const PUBLIC_LINKS = [
  { href: "/", labelKey: "home" },
  { href: "/track", labelKey: "tracking" },
  { href: "/services", labelKey: "services" },
  { href: "/pricing", labelKey: "pricing" },
  { href: "/about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
] as const;

export function PublicHeader() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [open, setOpen] = React.useState(false);
  const panelId = "public-mobile-menu";

  // Close the drawer whenever the route changes.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes the mobile drawer.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const home = homeForRole(user?.role);
  const ctaHref = isAuthenticated ? home.href : "/login";
  const ctaLabel = isAuthenticated ? home.labelKey : "signIn";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="dhruto-container flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Dhruto" className="shrink-0 rounded-md">
          <Logo />
        </Link>

        <nav aria-label={t("primaryLabel")} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_LINKS.map((link) => {
              const active = isActiveRoute(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-md px-3 text-body font-medium transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale} label={t("language")} />

          <Link href={ctaHref} className="hidden sm:inline-flex">
            <Button size="sm" className="h-9">
              {isAuthenticated ? t(ctaLabel) : t("signIn")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-surface-muted lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div id={panelId} className="border-t border-border bg-surface lg:hidden">
          <nav aria-label={t("primaryLabel")} className="dhruto-container py-3">
            <ul className="flex flex-col">
              {PUBLIC_LINKS.map((link) => {
                const active = isActiveRoute(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center rounded-md px-3 text-body font-medium",
                        active
                          ? "bg-primary-soft text-primary-soft-foreground"
                          : "text-foreground hover:bg-surface-muted",
                      )}
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="pt-3 sm:hidden">
              <Link href={ctaHref} className="block">
                <Button className="w-full">
                  {isAuthenticated ? t(ctaLabel) : t("signIn")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
