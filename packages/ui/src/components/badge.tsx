import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-200 uppercase tracking-wider select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "text-foreground bg-surface-muted",
        muted: "bg-muted text-muted-foreground",

        /* Soft variants are the default for status chips in tables/lists. */
        "primary-soft": "bg-primary-soft text-primary-soft-foreground",
        "success-soft": "bg-success-soft text-success-soft-foreground",
        "warning-soft": "bg-warning-soft text-warning-soft-foreground",
        "danger-soft": "bg-danger-soft text-danger-soft-foreground",
        "info-soft": "bg-info-soft text-info-soft-foreground",

        /* Solid variants for high-emphasis states. */
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        danger: "bg-danger text-danger-foreground",
        info: "bg-info text-info-foreground",
        destructive: "bg-danger text-danger-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
