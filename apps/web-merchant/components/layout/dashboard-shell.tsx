"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LanguageSwitcher,
  Logo,
  SidebarProvider,
  Sidebar,
  SidebarRail,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@dhruto/ui";
import { Link, usePathname, useRouter } from "@/lib/navigation";
import { bottomNavForRole, navForRole, type NavItem } from "@/config/navigation";
import {
  asAppRole,
  canAccessSection,
  homeForRole,
  roleConfigFor,
  type AppSection,
} from "@/config/roles";
import { isActiveRoute } from "@/config/routes";
import { cn } from "@/lib/cn";
import { useAppSelector } from "@/store/hooks";
import { useSignOut } from "@/lib/auth/session";
import { NotificationBell } from "@/components/notification-bell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileBottomNav } from "./mobile-bottom-nav";

/** Dashboard sections that render inside this shell. */
type DashboardSection = Extract<AppSection, "merchant" | "admin" | "hub" | "rider" | "customer">;

function SidebarNavItems({
  groups,
  onNavigate,
}: {
  groups: { labelKey?: string; items: NavItem[] }[];
  onNavigate?: () => void;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    onNavigate?.();
  };

  return (
    <>
      {groups.map((group) => {
        const groupKey = group.labelKey ?? group.items[0]?.href ?? "group";
        return (
          <SidebarGroup key={groupKey}>
            {group.labelKey ? (
              <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {t(group.labelKey)}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActiveRoute(pathname, item.href);
                  const Icon = item.icon;
                  const label = t(item.labelKey);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                      >
                        <Link
                          href={item.href}
                          onClick={handleItemClick}
                          aria-current={active ? "page" : undefined}
                          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200",
                              active ? "text-primary scale-110" : "text-muted-foreground",
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}

function MobileNavWithSidebar() {
  const { setOpenMobile } = useSidebar();
  return <MobileBottomNav onOpenMore={() => setOpenMobile(true)} />;
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
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { signOut } = useSignOut();

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  // Guards must not run during SSR (the store is not hydrated yet).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const role = asAppRole(user?.role);
  const roleConfig = roleConfigFor(role);
  const groups = navForRole(role);
  const bottomItems = bottomNavForRole(role);
  const showBottomNav = bottomItems.length > 0;

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

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.push("/login");
  };

  // Prevent flash of protected dashboard content before hydration or redirect
  if (!mounted || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">{t("loadingWorkspace")}</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        {/* Desktop & Mobile Collapsible Sidebar */}
        <Sidebar collapsible="icon" className="border-r-0 bg-surface/90">
          <SidebarHeader className="p-3">
            <Link
              href="/"
              aria-label="Dhruto"
              className="flex items-center gap-2 overflow-hidden rounded-xl transition-transform hover:scale-105 group-data-[collapsible=icon]:justify-center"
            >
              <div className="group-data-[collapsible=icon]:hidden">
                <Logo size="sm" />
              </div>
              <div className="hidden group-data-[collapsible=icon]:block">
                <Logo size="sm" markOnly />
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarNavItems groups={groups} />
          </SidebarContent>

          {/* Interactive hover/drag rail on edge for click-to-toggle */}
          <SidebarRail />
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 bg-surface/80 backdrop-blur-xl px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <Link href="/" aria-label="Dhruto" className="lg:hidden">
                <Logo size="sm" markOnly />
              </Link>
              <span className="hidden truncate text-sm font-bold text-foreground sm:block">
                {t(roleConfig.labelKey)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher currentLocale={locale} label={t("language")} />
              <ThemeSwitcher />
              <NotificationBell />
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 rounded-xl p-1.5 text-left transition-all duration-200 hover:bg-surface-muted focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 pl-3 ml-1"
                    aria-label={t("accountMenu")}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-xs font-bold text-white">
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
                    <ChevronDown
                      className="h-3.5 w-3.5 text-muted-foreground hidden sm:block"
                      aria-hidden="true"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-1.5 rounded-2xl bg-surface-elevated"
                >
                  <div className="px-3 py-2 border-b border-surface-muted mb-1">
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

                  <DropdownMenuSeparator className="my-1 bg-surface-muted" />

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
          <ConfirmDialog
            open={showLogoutModal}
            onOpenChange={setShowLogoutModal}
            title={t("logoutConfirmTitle")}
            description={t("logoutConfirmMessage")}
            confirmLabel={t("confirmSignOut")}
            cancelLabel={t("cancel")}
            tone="danger"
            onConfirm={() => {
              handleConfirmLogout();
            }}
          />

          <main
            id="main-content"
            key={pathname}
            className={cn(
              "flex-1 px-4 py-6 sm:px-6 lg:px-8",
              showBottomNav ? "pb-28 lg:pb-6" : undefined,
            )}
          >
            <div className="dhruto-animate-in w-full">{children}</div>
          </main>

          {/* Mobile bottom navigation — role specific, safe-area aware. */}
          <MobileNavWithSidebar />
        </div>
      </div>
    </SidebarProvider>
  );
}
