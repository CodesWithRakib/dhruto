import React from "react";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Merchant Registration — Dhruto",
  description:
    "Register your business on Dhruto to ship parcels with real-time tracking and automated COD reconciliation.",
};

export default function RegisterPage() {
  return (
    // Padding and centring come from the auth shell in AppShell.
    <div className="w-full">
      <RegisterForm />
    </div>
  );
}
