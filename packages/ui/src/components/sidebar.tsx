"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";
import { Sheet, SheetContent, SheetTitle } from "./sheet.js";
import { Tooltip } from "./tooltip.js";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "4rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

interface SidebarContextProps {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [openMobile, setOpenMobile] = React.useState(false);

  // Responsive mobile detector
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [_open, _setOpen] = React.useState(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(new RegExp(`(^| )${SIDEBAR_COOKIE_NAME}=([^;]+)`));
      if (match) return match[2] === "true";
    }
    return defaultOpen;
  });

  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      }
    },
    [setOpenProp, open],
  );

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev);
  }, [isMobile, setOpen, setOpenMobile]);

  // Keyboard shortcut Ctrl+B / Cmd+B
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-background",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "icon",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === "none") {
      return (
        <div
          ref={ref}
          className={cn(
            "flex h-full w-[--sidebar-width] flex-col bg-surface text-sidebar-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            side={side}
            className="w-[--sidebar-width-mobile] bg-surface p-0 text-sidebar-foreground [&>button]:hidden"
            style={
              {
                "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
          >
            <SheetTitle className="sr-only">Sidebar Navigation</SheetTitle>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <div
        ref={ref}
        className="group peer hidden lg:block text-sidebar-foreground shrink-0"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* Placeholder spacer so page content shifts cleanly */}
        <div
          className={cn(
            "relative h-svh bg-transparent transition-[width] ease-linear duration-200",
            state === "expanded" ? "w-[--sidebar-width]" : "w-[--sidebar-width-icon]",
          )}
        />
        <aside
          className={cn(
            "fixed inset-y-0 z-20 hidden h-svh transition-[left,right,width] ease-linear duration-200 lg:flex flex-col",
            side === "left"
              ? "left-0"
              : "right-0",
            state === "expanded" ? "w-[--sidebar-width]" : "w-[--sidebar-width-icon]",
            variant === "floating"
              ? "p-2"
              : "bg-surface/90 backdrop-blur-xl border-r border-border/70 shadow-2xs",
            className,
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-2xl group-data-[variant=floating]:border group-data-[variant=floating]:border-border group-data-[variant=floating]:shadow-md"
          >
            {children}
          </div>
        </aside>
      </div>
    );
  },
);
Sidebar.displayName = "Sidebar";

export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-primary/50 group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex cursor-w-resize group-data-[state=collapsed]:cursor-e-resize",
        className,
      )}
      {...props}
    />
  );
});
SidebarRail.displayName = "SidebarRail";

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9 rounded-xl hover:bg-surface-muted transition-colors", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      aria-label="Toggle Sidebar Navigation"
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="header"
    className={cn("flex flex-col gap-2 p-3", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="footer"
    className={cn("flex flex-col gap-2 p-3 mt-auto", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="content"
    className={cn(
      "flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2 scrollbar-thin",
      className,
    )}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group"
    className={cn("relative flex w-full min-w-0 flex-col p-1 mb-2", className)}
    {...props}
  />
));
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-lg px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 outline-none transition-[margin,opa] ease-linear group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative list-none", className)}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-xl p-2 text-left text-sm font-medium outline-none transition-all duration-200 hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-surface-muted hover:text-foreground",
        outline:
          "bg-surface shadow-[0_0_0_1px_hsl(var(--border))] hover:bg-surface-muted hover:shadow-[0_0_0_1px_hsl(var(--primary))]",
      },
      size: {
        default: "h-10 text-sm",
        sm: "h-8 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!size-12",
      },
      isActive: {
        true: "bg-primary-soft text-primary font-semibold border border-primary/25 shadow-2xs",
        false: "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      isActive: false,
    },
  },
);

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size, isActive }), className)}
        {...props}
      >
        {children}
      </Comp>
    );

    if (!tooltip) {
      return button;
    }

    // In desktop icon/collapsed mode, show Tooltip
    if (!isMobile && state === "collapsed") {
      return (
        <Tooltip content={tooltip} side="right">
          {button}
        </Tooltip>
      );
    }

    return button;
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "pointer-events-none absolute right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary group-data-[collapsible=icon]:hidden",
      className,
    )}
    {...props}
  />
));
SidebarMenuBadge.displayName = "SidebarMenuBadge";

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn(
      "relative flex min-h-svh flex-1 flex-col bg-background",
      className,
    )}
    {...props}
  />
));
SidebarInset.displayName = "SidebarInset";
