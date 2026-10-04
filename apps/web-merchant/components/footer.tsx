import React from "react";

export function Footer() {
  return (
    <footer className="border-t bg-card py-6 text-center text-xs text-muted-foreground mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 Dhruto Logistics Platform. Built for Bangladesh E-Commerce & Retail Supply Chain.</p>
        <p className="font-mono">API Target: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}</p>
      </div>
    </footer>
  );
}
