"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LanguageSwitcher,
  Logo,
} from "@dhruto/ui";
import { Link, usePathname, useRouter } from "@/lib/navigation";
import {
  bottomNavForRole,
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
import { MobileBottomNav } from "./mobile-bottom-nav";

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
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  // Guards must not run during SSR (the store is not hydrated yet).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const role = asAppRole(user?.role);
  const roleConfig = roleConfigFor(role);
  const groups = navForRole(role);
  const bottomItems = bottomNavForRole(role);
  // const showMore = hasMoreForRole(role);
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

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    dispatch(logout());
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 h-screen hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
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
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 border-l border-border pl-3 ml-1"
                  aria-label="User account menu"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F172A] font-bold text-white text-xs shadow-sm">
                    {(user?.name || "M").charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden flex-col text-left sm:flex">
                    <span className="max-w-[150px] truncate text-xs font-bold text-foreground leading-tight">
                      {user?.name ?? "Merchant Name"}
                    </span>
                    <span className="max-w-[150px] truncate text-[11px] text-muted-foreground leading-tight">
                      {user?.email ?? "merchant@dhruto.com"}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border border-border bg-surface shadow-xl">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {user?.name ?? "Merchant"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email ?? "merchant@dhruto.com"}
                  </p>
                  <div className="mt-1.5 inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary-soft-foreground uppercase tracking-wider">
                    {t(roleConfig.labelKey)}
                  </div>
                </div>

                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
                >
                  <Link href={`/${section}/settings`}>
                    <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{t("profile")}</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border" />

                <DropdownMenuItem
                  onClick={() => setShowLogoutModal(true)}
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium text-danger hover:bg-danger-soft hover:text-danger-soft-foreground transition-colors focus:bg-danger-soft focus:text-danger-soft-foreground"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>{t("signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Confirmation Modal for Logout */}
        <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                <LogOut className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {t("logoutConfirmTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("logoutConfirmMessage")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLogoutModal(false)}
                className="w-full sm:w-auto"
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmLogout}
                className="w-full sm:w-auto bg-danger text-danger-foreground hover:bg-danger/90"
              >
                <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" />
                {t("confirmSignOut")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <main
          id="main-content"
          className={cn(
            "flex-1 px-4 py-6 sm:px-6 lg:px-8",
            showBottomNav ? "pb-28 lg:pb-6" : undefined,
          )}
        >
          <div className="w-full">{children}</div>
        </main>

        {/* Mobile bottom navigation — role specific, safe-area aware. */}
        <MobileBottomNav onOpenMore={() => setDrawerOpen(true)} />
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
                  onClick={() => {
                    setDrawerOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="flex h-12 w-full items-center gap-2.5 rounded-md px-3 text-body font-medium text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
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
