import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-200 uppercase tracking-wider border select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border-primary/20",
        secondary: "bg-secondary text-secondary-foreground border-border/60",
        outline: "border-border/80 text-foreground bg-transparent",
        muted: "bg-muted text-muted-foreground border-border/40",

        /* Soft variants are the default for status chips in tables/lists. */
        "primary-soft": "bg-primary-soft text-primary-soft-foreground border-primary/25",
        "success-soft": "bg-success-soft text-success-soft-foreground border-success/25",
        "warning-soft": "bg-warning-soft text-warning-soft-foreground border-warning/25",
        "danger-soft": "bg-danger-soft text-danger-soft-foreground border-danger/25",
        "info-soft": "bg-info-soft text-info-soft-foreground border-info/25",

        /* Solid variants for high-emphasis states. */
        success: "bg-success text-success-foreground border-transparent shadow-2xs",
        warning: "bg-warning text-warning-foreground border-transparent shadow-2xs",
        danger: "bg-danger text-danger-foreground border-transparent shadow-2xs",
        info: "bg-info text-info-foreground border-transparent shadow-2xs",
        destructive: "bg-danger text-danger-foreground border-transparent shadow-2xs",
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
