import React from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@dhruto/ui";
import { PackagePlus, Truck, ShieldCheck, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Dhruto Merchant Portal
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Tech-first logistics operating system for Bangladesh. Automated parcel booking, real-time tracking, reliable COD settlement, and unified merchant workflows.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <Link href="/bookings/new">
            <Button size="lg" className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5" />
              Create New Booking
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <Card>
          <CardHeader>
            <div className="p-2 w-fit bg-primary/10 rounded-lg text-primary mb-2">
              <PackagePlus className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Seamless Booking</CardTitle>
            <CardDescription>
              Validated against standardized 64 districts and thanas with strict BD phone format verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/bookings/new" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              Open Booking Form →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 w-fit bg-emerald-100 rounded-lg text-emerald-700 mb-2">
              <Truck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Real-Time State Machine</CardTitle>
            <CardDescription>
              Track parcels through 21 validated operational states from pickup to cash settlement.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 w-fit bg-indigo-100 rounded-lg text-indigo-700 mb-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Auditable Financial Ledger</CardTitle>
            <CardDescription>
              Transparent COD collection, verified rider reconciliation, and fast digital payouts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
