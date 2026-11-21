import React from "react";
import type { LucideIcon } from "lucide-react";

interface BookingSectionWrapperProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function BookingSectionWrapper({
  icon: Icon,
  title,
  description,
  children,
}: BookingSectionWrapperProps) {
  return (
    <fieldset className="space-y-3.5 p-0 border-0">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        </div>
        <p className="text-[11px] text-muted-foreground hidden sm:block">{description}</p>
      </div>
      {children}
    </fieldset>
  );
}
