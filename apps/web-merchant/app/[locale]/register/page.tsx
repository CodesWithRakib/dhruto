import React from "react";
import { RegisterForm } from "../../../features/auth/components/register-form";

export const metadata = {
  title: "Merchant Registration — Dhruto",
  description: "Register your business on Dhruto to ship parcels with real-time tracking and automated COD reconciliation.",
};

export default function RegisterPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <RegisterForm />
    </div>
  );
}
