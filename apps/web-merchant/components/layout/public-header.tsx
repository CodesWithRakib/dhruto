"use client";

import * as React from "react";
import { Menu, X, ArrowRight, Sparkles, ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  LanguageSwitcher,
  Logo,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dhruto/ui";
import { Link, usePathname } from "@/lib/navigation";
import { isActiveRoute } from "@/config/routes";
import { homeForRole, roleConfigFor } from "@/config/roles";
import { useAppSelector } from "@/store/hooks";
import { useSignOut } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { PublicStatusIndicator } from "./public-status-indicator";

const PUBLIC_LINKS = [
  { href: "/", labelKey: "home" },
  { href: "/services", labelKey: "services" },
  { href: "/track", labelKey: "tracking" },
  { href: "/pricing", labelKey: "calculator" },
  { href: "/about", labelKey: "about" },
] as const;

/** Extra links shown only in the mobile drawer, where space is not a constraint. */
const MOBILE_EXTRA_LINKS = [
  { href: "/status", labelKey: "status" },
  { href: "/faq", labelKey: "faq" },
  { href: "/contact", labelKey: "support" },
] as const;

export function PublicHeader() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { signOut } = useSignOut();

  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const panelId = "public-mobile-menu";

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-[rgba(var(--dk-rgb),0.88)] text-white backdrop-blur-xl"
          : "bg-[var(--dk)] text-white",
      )}
    >
      <div className="dhruto-container flex h-16 sm:h-20 items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" aria-label="Dhruto" className="shrink-0 transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <Logo inverted />
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label={t("primaryLabel")} className="hidden lg:flex items-center">
          <ul className="flex items-center gap-1.5 rounded-full bg-white/[0.04] p-1.5 backdrop-blur-md">
            {PUBLIC_LINKS.map((link) => {
              const active = isActiveRoute(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-[var(--acc)] text-[var(--dk)] font-semibold"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <PublicStatusIndicator />
          <div className="text-white">
            <LanguageSwitcher currentLocale={locale} label={t("language")} />
          </div>

          {isAuthenticated ? (
            <div className="hidden sm:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-full bg-white/5 py-1.5 pl-2 pr-3 text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-all"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--acc)] text-[var(--dk)] font-bold text-xs uppercase">
                      {user?.name ? user.name[0] : (user?.role ? user.role[0] : "U")}
                    </span>
                    <span className="max-w-[120px] truncate text-xs font-semibold">
                      {user?.name || user?.role || "Account"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl bg-[var(--dk2)] text-white">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-sm font-bold text-white truncate">{user?.name || "Account"}</p>
                    {user?.email && <p className="text-xs text-white/70 truncate">{user.email}</p>}
                    <span className="mt-1.5 inline-block rounded-full bg-[var(--acc)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dk)]">
                      {user?.role}
                    </span>
                  </div>

                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-2.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 transition-colors">
                    <Link href={home.href} className="flex items-center gap-2 w-full">
                      <LayoutDashboard className="h-4 w-4 text-[var(--acc)]" />
                      <span>{t("openApp")}</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-white/10" />

                  <DropdownMenuItem
                    onClick={() => void signOut()}
                    className="cursor-pointer rounded-xl px-2.5 py-2 text-xs font-semibold text-danger hover:bg-danger/20 hover:text-danger transition-colors flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>{t("signOut")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/register"
                className="btn-bl inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("register")}
                <ArrowRight className="h-3.5 w-3.5 ar" />
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-surface-muted lg:hidden transition-colors"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open ? (
        <div id={panelId} className="bg-[var(--dk2)] text-white backdrop-blur-2xl lg:hidden">
          <nav aria-label={t("primaryLabel")} className="dhruto-container py-4 space-y-3">
            {isAuthenticated && user && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--acc)] text-[var(--dk)] font-bold text-sm uppercase">
                    {user?.name ? user.name[0] : (user?.role ? user.role[0] : "U")}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white truncate">{user?.name || "User"}</p>
                    <span className="text-[11px] font-semibold text-[var(--acc)] uppercase">{t(roleConfigFor(user?.role).labelKey)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-danger text-xs font-semibold hover:bg-danger/10"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("signOut")}</span>
                </button>
              </div>
            )}

            <ul className="flex flex-col gap-1">
              {[...PUBLIC_LINKS, ...MOBILE_EXTRA_LINKS].map((link) => {
                const active = isActiveRoute(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center rounded-xl px-4 text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--acc)] text-[var(--dk)] font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="pt-2 sm:hidden space-y-2">
              <Link href={ctaHref} className="block">
                <button type="button" className="w-full h-11 rounded-xl font-semibold btn-bl flex items-center justify-center gap-2">
                  {isAuthenticated ? t("openApp") : t("signIn")}
                  <ArrowRight className="h-4 w-4 ml-1 ar" aria-hidden="true" />
                </button>
              </Link>
              {!isAuthenticated && (
                <Link href="/register" className="block">
                  <button type="button" className="w-full h-11 rounded-xl font-semibold btn-bw flex items-center justify-center gap-2">
                    {t("register")}
                  </button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
