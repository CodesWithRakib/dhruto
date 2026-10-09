"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4.5 text-sm shadow-2xs backdrop-blur-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4.5 [&>svg]:w-4.5 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-surface text-foreground border-border/80",
        destructive:
          "border-danger/30 text-danger-soft-foreground bg-danger-soft/80 [&>svg]:text-danger",
        success:
          "border-success/30 text-success-soft-foreground bg-success-soft/80 [&>svg]:text-success",
        warning:
          "border-warning/30 text-warning-soft-foreground bg-warning-soft/80 [&>svg]:text-warning",
        info: "border-info/30 text-info-soft-foreground bg-info-soft/80 [&>svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-bold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-xs leading-relaxed opacity-90 [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
