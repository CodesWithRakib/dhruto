import React from "react";
import { LoginForm } from "../../../features/auth/components/login-form";

export const metadata = {
  title: "Merchant Sign In — Dhruto",
  description: "Sign in to Dhruto Merchant Portal to manage your express shipments and COD payouts.",
};

export default function LoginPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
