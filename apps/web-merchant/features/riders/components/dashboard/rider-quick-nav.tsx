"use client";

import React from "react";
import { ArrowRight, ClipboardList, History, Settings, User } from "lucide-react";
import { Link } from "@/lib/navigation";
import { RIDER_ROUTES } from "@/config/routes";

interface RiderQuickNavProps {
  activeCount: number;
  inFlightCount: number;
  deliveredTodayCount: number;
  riderCode: string;
  hubName: string;
}

export function RiderQuickNav({
  activeCount,
  inFlightCount,
  deliveredTodayCount,
  riderCode,
  hubName,
}: RiderQuickNavProps) {
  const quickNav = [
    {
      title: "Delivery Runsheet",
      subtitle: `${activeCount} tasks active`,
      href: RIDER_ROUTES.tasks,
      icon: ClipboardList,
      badge: `${inFlightCount} In-Flight`,
    },
    {
      title: "Delivery History",
      subtitle: `${deliveredTodayCount} completed today`,
      href: RIDER_ROUTES.history,
      icon: History,
      badge: "Settled",
    },
    {
      title: "Rider Profile",
      subtitle: `${riderCode} · Hub ${hubName}`,
      href: RIDER_ROUTES.profile,
      icon: User,
      badge: "Fleet ID",
    },
    {
      title: "Shift Settings",
      subtitle: "Duty, vehicle & notification toggles",
      href: RIDER_ROUTES.settings,
      icon: Settings,
      badge: "Config",
    },
  ];

  return (
    <section aria-label="Rider Quick Navigation">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-col justify-between rounded-3xl bg-card/90 backdrop-blur-md p-4 transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Specular top highlight */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                  {item.subtitle}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary">
                <span>View Details</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
