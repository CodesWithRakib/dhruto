"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, Menu, MoreHorizontal, X } from "lucide-react";
import { Button, LanguageSwitcher, Logo } from "@dhruto/ui";
import { Link, usePathname, useRouter } from "@/lib/navigation";
import {
  bottomNavForRole,
  hasMoreForRole,
  navForRole,
  type NavItem,
} from "@/config/navigation";
import {
  asAppRole,
  canAccessSection,
  homeForRole,
  roleConfigFor,
  type AppSection,
} from "@/config/roles";
import { isActiveRoute } from "@/config/routes";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/auth.slice";
import { NotificationBell } from "@/components/notification-bell";

/** Dashboard sections that render inside this shell. */
type DashboardSection = Extract<AppSection, "merchant" | "admin" | "hub" | "rider">;

function NavLinks({
  items,
  onNavigate,
  variant = "sidebar",
}: {
  items: NavItem[];
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActiveRoute(pathname, item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 text-body font-medium transition-colors",
                variant === "drawer" ? "h-12" : "h-10",
                active
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardShell({
  children,
  section,
}: {
  children: React.ReactNode;
  section: DashboardSection;
}) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Guards must not run during SSR (the store is not hydrated yet).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const role = asAppRole(user?.role);
  const roleConfig = roleConfigFor(role);
  const groups = navForRole(role);
  const bottomItems = bottomNavForRole(role);
  const showMore = hasMoreForRole(role);
  const showBottomNav = bottomItems.length > 0;

  // Close the drawer whenever the route changes.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Client-side guard: unauthenticated -> login; wrong section -> role home.
  React.useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!canAccessSection(role, section)) {
      router.replace(homeForRole(role).href);
    }
  }, [mounted, isAuthenticated, role, section, router]);

  // Escape closes the mobile drawer.
  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/" aria-label="Dhruto" className="rounded-md">
            <Logo size="sm" />
          </Link>
        </div>
        <nav aria-label={t("primaryLabel")} className="flex-1 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.labelKey ?? group.items[0]?.href} className="mb-4">
              {group.labelKey ? (
                <p className="px-3 pb-1.5 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.labelKey)}
                </p>
              ) : null}
              <NavLinks items={group.items} />
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("openMenu")}
              aria-expanded={drawerOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-surface-muted lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link href="/" aria-label="Dhruto" className="lg:hidden">
              <Logo size="sm" markOnly />
            </Link>
            <span className="hidden truncate text-h4 text-foreground lg:block">
              {t(roleConfig.labelKey)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} label={t("language")} />
            <NotificationBell />
            <div className="hidden items-center gap-2.5 sm:flex border-l border-border pl-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-bold text-white text-xs shadow-sm">
                {(user?.name || "M").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="max-w-[150px] truncate text-xs font-bold text-foreground leading-tight">
                  {user?.name ?? "Merchant Name"}
                </span>
                <span className="max-w-[150px] truncate text-[11px] text-muted-foreground leading-tight">
                  {user?.email ?? "merchant@dhruto.com"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              aria-label={t("signOut")}
              title={t("signOut")}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <main
          id="main-content"
          className={cn(
            "flex-1 px-4 py-6 sm:px-6 lg:px-8",
            showBottomNav ? "pb-28 lg:pb-6" : undefined,
          )}
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Mobile bottom navigation — role specific, safe-area aware. */}
        {showBottomNav ? (
          <nav
            aria-label={t("primaryLabel")}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe lg:hidden"
          >
            <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
              {bottomItems.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href} className="flex-1">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-caption font-medium",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
              {showMore ? (
                <li className="flex-1">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    aria-haspopup="dialog"
                    className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-caption font-medium text-muted-foreground"
                  >
                    <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                    <span className="truncate">{t("more")}</span>
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("primaryLabel")}
            className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] overflow-y-auto border-r border-border bg-surface"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("closeMenu")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-surface-muted"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label={t("primaryLabel")} className="p-3 pb-safe">
              {groups.map((group) => (
                <div key={group.labelKey ?? group.items[0]?.href} className="mb-4">
                  {group.labelKey ? (
                    <p className="px-3 pb-1.5 text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(group.labelKey)}
                    </p>
                  ) : null}
                  <NavLinks
                    items={group.items}
                    variant="drawer"
                    onNavigate={() => setDrawerOpen(false)}
                  />
                </div>
              ))}
              <div className="mt-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-12 w-full items-center gap-2.5 rounded-md px-3 text-body font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("signOut")}
                </button>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
