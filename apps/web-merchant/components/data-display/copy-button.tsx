"use client";

import * as React from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@dhruto/ui";
import { cn } from "@/lib/cn";

export interface CopyButtonProps {
  /** Text written to the clipboard (e.g. a tracking code). */
  value: string;
  /** Accessible name, e.g. "Copy tracking ID". */
  label: string;
  /** Shown after a successful copy (toast + screen-reader announcement). */
  copiedLabel: string;
  /** Shown when the browser denies clipboard access. */
  errorLabel: string;
  variant?: "ghost" | "outline" | "soft" | "secondary";
  /** `icon` is a 44px target — use it on touch surfaces. */
  size?: "icon" | "icon-sm" | "sm";
  /** Renders the label next to the icon instead of icon-only. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Copy-to-clipboard control used wherever an operator needs to lift an
 * identifier out of Dhruto (tracking codes, API keys, webhook secrets).
 *
 * Feedback is deliberately doubled: the icon swaps to a check for immediate
 * local confirmation, and the project's global `sonner` toaster reports the
 * outcome. Both are announced to assistive tech — the icon swap through a
 * polite live region, the toast through sonner's own live region.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  errorLabel,
  variant = "ghost",
  size = "icon-sm",
  showLabel = false,
  className,
}: CopyButtonProps) {
  const [state, setState] = React.useState<"idle" | "copied" | "error">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // A copy mid-unmount must not set state afterwards.
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = React.useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(value);
      setState("copied");
      toast.success(copiedLabel);
    } catch {
      // Clipboard access can be denied (permissions, insecure context). The
      // identifier stays visible on screen for manual copying.
      setState("error");
      toast.error(errorLabel);
    } finally {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 2000);
    }
  }, [copiedLabel, errorLabel, value]);

  const Icon = state === "copied" ? Check : state === "error" ? TriangleAlert : Copy;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => void handleCopy()}
        aria-label={label}
        title={label}
        className={cn(
          size === "icon" || size === "icon-sm" ? "shrink-0" : "gap-1.5",
          state === "copied" && "text-success",
          state === "error" && "text-danger",
          className,
        )}
      >
        <Icon
          className={cn("h-3.5 w-3.5", size === "icon" && "h-4 w-4")}
          aria-hidden="true"
        />
        {showLabel ? <span>{state === "copied" ? copiedLabel : label}</span> : null}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? copiedLabel : state === "error" ? errorLabel : ""}
      </span>
    </span>
  );
}
