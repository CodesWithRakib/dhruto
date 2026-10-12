import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils.js";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20 active:shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/50 hover:bg-secondary/80 hover:border-border",
        soft:
          "bg-primary-soft text-primary-soft-foreground border border-primary/20 hover:bg-primary-soft/80",
        outline:
          "border border-border/80 bg-surface text-foreground shadow-2xs hover:bg-surface-muted hover:border-foreground/20 hover:text-foreground",
        ghost:
          "text-foreground hover:bg-surface-muted hover:text-foreground",
        destructive:
          "bg-danger text-danger-foreground shadow-xs hover:bg-danger/90 hover:shadow-md hover:shadow-danger/20",
        link:
          "text-primary underline-offset-4 hover:underline",
        elevated:
          "bg-surface text-foreground border border-border/80 shadow-sm hover:shadow-md hover:-translate-y-0.5",
      },
      size: {
        /* Touch friendly accessible targets */
        default: "h-11 px-5 text-sm",
        sm: "h-9 rounded-lg px-3.5 text-xs font-semibold",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
