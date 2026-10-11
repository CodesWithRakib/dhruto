import React, { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { Skeleton } from "@dhruto/ui";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Set New Password — Dhruto",
  description: "Set a new secure password for your Dhruto account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
