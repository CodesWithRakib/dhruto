import React from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Merchant Sign In — Dhruto",
  description:
    "Sign in to Dhruto Merchant Portal to manage your express shipments and COD payouts.",
};

export default function LoginPage() {
  return (
    // Padding and centring come from the auth shell in AppShell.
    <div className="w-full">
      <LoginForm />
    </div>
  );
}
