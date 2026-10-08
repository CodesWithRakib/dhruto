"use client";

import * as React from "react";
import { Menu, X, ArrowRight, Sparkles, ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
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
import { ThemeSwitcher } from "@/components/theme-switcher";

const PUBLIC_LINKS = [
  { href: "/", labelKey: "home" },
  { href: "/services", labelKey: "services" },
  { href: "/pricing", labelKey: "calculator" },
  { href: "/track", labelKey: "tracking" },
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
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "border-b border-border bg-surface/95 backdrop-blur-md shadow-sm"
          : "border-b border-border/50 bg-surface/85 backdrop-blur-sm",
      )}
    >
      <div className="dhruto-container flex h-16 sm:h-20 items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" aria-label="Dhruto" className="shrink-0 transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label={t("primaryLabel")} className="hidden lg:flex items-center">
          <ul className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted/60 p-1 backdrop-blur-md shadow-inner">
            {PUBLIC_LINKS.map((link) => {
              const active = isActiveRoute(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-4 text-body font-medium transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-surface hover:text-foreground",
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
          <ThemeSwitcher />
          <LanguageSwitcher currentLocale={locale} label={t("language")} />

          {isAuthenticated ? (
            <div className="hidden sm:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface py-1.5 pl-2 pr-3 text-body font-medium text-foreground hover:bg-surface-muted hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all shadow-sm"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground font-bold text-xs uppercase">
                      {user?.name ? user.name[0] : (user?.role ? user.role[0] : "U")}
                    </span>
                    <span className="max-w-[120px] truncate text-xs font-semibold">
                      {user?.name || user?.role || "Account"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl border border-border bg-surface shadow-xl">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-sm font-bold text-foreground truncate">{user?.name || "Account"}</p>
                    {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                    <span className="mt-1.5 inline-block rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-soft-foreground">
                      {user?.role}
                    </span>
                  </div>

                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors">
                    <Link href={home.href} className="flex items-center gap-2 w-full">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <span>{t("openApp")}</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-border" />

                  <DropdownMenuItem
                    onClick={() => void signOut()}
                    className="cursor-pointer rounded-xl px-2.5 py-2 text-xs font-semibold text-danger hover:bg-danger-soft hover:text-danger-soft-foreground transition-colors flex items-center gap-2"
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
                className="inline-flex h-10 items-center rounded-xl px-4 text-body font-medium text-foreground/80 hover:text-foreground hover:bg-surface-muted transition-colors"
              >
                {t("signIn")}
              </Link>
              <Link href="/register">
                <Button size="sm" className="h-10 px-5 rounded-xl font-semibold shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/40">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary-foreground/90" />
                  {t("register")}
                </Button>
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 text-foreground hover:bg-surface-muted lg:hidden transition-colors"
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
        <div id={panelId} className="border-t border-border/50 bg-surface/95 backdrop-blur-2xl lg:hidden shadow-2xl">
          <nav aria-label={t("primaryLabel")} className="dhruto-container py-4 space-y-3">
            {isAuthenticated && user && (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-surface-muted/50 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground font-bold text-sm uppercase">
                    {user?.name ? user.name[0] : (user?.role ? user.role[0] : "U")}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground truncate">{user?.name || "User"}</p>
                    <span className="text-[11px] font-semibold text-primary uppercase">{t(roleConfigFor(user?.role).labelKey)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-danger/30 text-danger-soft-foreground text-xs font-semibold hover:bg-danger-soft"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("signOut")}</span>
                </button>
              </div>
            )}

            <ul className="flex flex-col gap-1">
              {PUBLIC_LINKS.map((link) => {
                const active = isActiveRoute(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center rounded-xl px-4 text-body font-medium transition-colors",
                        active
                          ? "bg-primary-soft text-primary font-semibold border border-primary/20"
                          : "text-foreground hover:bg-surface-muted",
                      )}
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="pt-2 sm:hidden border-t border-border/40 space-y-2">
              <Link href={ctaHref} className="block">
                <Button className="w-full h-11 rounded-xl font-semibold">
                  {isAuthenticated ? t("openApp") : t("signIn")}
                  <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link href="/register" className="block">
                  <Button variant="outline" className="w-full h-11 rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary-soft">
                    {t("register")}
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
