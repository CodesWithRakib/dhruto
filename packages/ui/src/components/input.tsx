import * as React from "react";
import { cn } from "../lib/utils.js";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the field in its invalid state and wires aria-invalid. */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          "flex h-11 w-full rounded-xl bg-field px-3.5 py-2 text-sm text-foreground transition-all duration-200",
          "placeholder:text-muted-foreground/80",
          "hover:bg-field-hover focus-visible:bg-surface",
          "file:border-0 file:bg-transparent file:text-sm file:font-semibold",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40",
          "aria-[invalid=true]:bg-danger-soft/60 aria-[invalid=true]:focus-visible:ring-danger/25",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
