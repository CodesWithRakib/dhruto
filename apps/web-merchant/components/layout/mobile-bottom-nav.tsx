"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { Link, usePathname } from "@/lib/navigation";
import { bottomNavForRole, hasMoreForRole } from "@/config/navigation";
import { asAppRole } from "@/config/roles";
import { isActiveRoute } from "@/config/routes";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/cn";

export interface MobileBottomNavProps {
  onOpenMore?: () => void;
  className?: string;
}

export function MobileBottomNav({ onOpenMore, className }: MobileBottomNavProps) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);

  const role = asAppRole(user?.role);
  const bottomItems = bottomNavForRole(role);
  const showMore = hasMoreForRole(role);

  if (!bottomItems || bottomItems.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={t("primaryLabel")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe lg:hidden shadow-sm",
        className
      )}
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
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-caption font-medium transition-colors",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground active:text-primary"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="truncate text-[11px] leading-none">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}

        {showMore && onOpenMore ? (
          <li className="flex-1">
            <button
              type="button"
              onClick={onOpenMore}
              aria-haspopup="dialog"
              className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-caption font-medium text-muted-foreground hover:text-foreground active:text-primary transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              <span className="truncate text-[11px] leading-none">{t("more")}</span>
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
