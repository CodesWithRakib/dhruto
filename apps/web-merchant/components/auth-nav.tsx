"use client";

import React from "react";
import { Link, useRouter } from "@/lib/navigation";
import { Button } from "@dhruto/ui";
import { LogIn, LogOut, User } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/auth.slice";
import { toast } from "sonner";

export function AuthNav() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Signed out successfully");
    router.push("/login");
  };

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-2">
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-muted/60 border rounded-full text-xs font-medium">
          <User className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[120px] truncate text-foreground">{user.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-2"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    );
  }

  return (
    <Link href="/login">
      <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
        <LogIn className="h-3.5 w-3.5" />
        Sign In
      </Button>
    </Link>
  );
}
