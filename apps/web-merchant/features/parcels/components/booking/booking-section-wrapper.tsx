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
    <fieldset className="space-y-4 p-0">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3 pb-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-body-sm font-bold text-foreground tracking-tight">{title}</p>
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </fieldset>
  );
}
