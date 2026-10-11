import React from "react";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Reset Password — Dhruto",
  description: "Request a secure password recovery link for your Dhruto account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full">
      <ForgotPasswordForm />
    </div>
  );
}
