"use client";

import { useEffect } from "react";
import { useAppSelector } from "../../../store/hooks";
import { useRouter } from "@/lib/navigation";
import { AUTH_ROUTES, MERCHANT_ROUTES, ADMIN_ROUTES } from "@/config/routes";

/**
 * Role-aware analytics entry: redirects users to their designated
 * shelled dashboard (/merchant/analytics or /admin/analytics).
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(AUTH_ROUTES.login);
      return;
    }
    if (user?.role === "MERCHANT") {
      router.replace(MERCHANT_ROUTES.analytics);
    } else {
      router.replace(ADMIN_ROUTES.analytics);
    }
  }, [isAuthenticated, user?.role, router]);

  return null;
}

