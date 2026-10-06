"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
} from "@dhruto/ui";
import {
  Bike,
  Package,
  CheckCircle2,
  Clock,
  Wallet,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
} from "lucide-react";
import {
  useGetRiderTasksQuery,
  useStartDeliveryMutation,
  useGetCashSummaryQuery,
} from "../api/riders.api";
import { Link } from "@/lib/navigation";
import { type RiderTaskItem } from "@dhruto/contracts";
import { RiderTaskCard } from "./rider-task-card";
import { DeliveryOtpModal } from "./delivery-otp-modal";
import { DeliveryFailModal } from "./delivery-fail-modal";
import { getApiErrorMessage } from "@/lib/api-error";
import { RiderCashModal } from "./rider-cash-modal";
import { toast } from "sonner";

export function RiderDashboard() {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedTaskForOtp, setSelectedTaskForOtp] = useState<RiderTaskItem | null>(null);
  const [selectedTaskForFail, setSelectedTaskForFail] = useState<RiderTaskItem | null>(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);

  const { data: tasksData, isLoading, refetch: refetchTasks, error } = useGetRiderTasksQuery();
  const { data: cashData, refetch: refetchCash } = useGetCashSummaryQuery();

  const [startDeliveryMutation, { isLoading: isStarting }] = useStartDeliveryMutation();

  const tasks = tasksData?.data || [];
  const cashSummary = cashData?.data || {
    totalCollected: 0,
    pendingHandIn: 0,
    awaitingVerification: 0,
    verifiedByHub: 0,
    totalParcelsCount: 0,
  };

  const handleStartDelivery = async (parcelId: string) => {
    try {
      const res = await startDeliveryMutation(parcelId).unwrap();
      if (res.success) {
        toast.success(res.message || "Parcel is now OUT_FOR_DELIVERY!");
        refetchTasks();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to start delivery run"));
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      search === "" ||
      t.trackingCode.toLowerCase().includes(search.toLowerCase()) ||
      t.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      t.recipientPhone.includes(search);

    const matchesTab =
      activeTab === "ALL" ||
      (activeTab === "OUT" && t.status === "OUT_FOR_DELIVERY") ||
      (activeTab === "ASSIGNED" && t.status === "ASSIGNED_TO_RIDER") ||
      (activeTab === "COMPLETED" && (t.status === "DELIVERED" || t.status === "CASH_PENDING"));

    return matchesSearch && matchesTab;
  });

  const outCount = tasks.filter((t) => t.status === "OUT_FOR_DELIVERY").length;
  const assignedCount = tasks.filter((t) => t.status === "ASSIGNED_TO_RIDER").length;
  const completedCount = tasks.filter(
    (t) => t.status === "DELIVERED" || t.status === "CASH_PENDING",
  ).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="bg-card border rounded-2xl p-5 sm:p-6  flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
            <Bike className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Rider Delivery Terminal</h1>
              <Badge variant="outline" className="border-success text-success bg-success-soft text-[10px]">
                On Duty
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Last-mile dispatch, OTP verification, and cash collection ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCashModalOpen(true)}
            className="h-9 px-3 gap-1.5 border-warning text-warning  hover:bg-warning-soft text-xs font-semibold"
          >
            <Wallet className="h-4 w-4 text-warning" />
            Cash: ৳{cashSummary.pendingHandIn.toLocaleString()}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchTasks();
              refetchCash();
            }}
            className="h-9 w-9 p-0"
            title="Refresh Tasks"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Rider Authentication Alert */}
      {error && (
        <Card className="border-warning bg-warning-soft p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-start gap-2.5">
              <UserCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">
                  Rider Authentication Required
                </p>
                <p className="text-xs text-warning mt-0.5">
                  You are currently logged in with a non-rider account. Please log in with an authorized Rider account to manage deliveries.
                </p>
              </div>
            </div>
            <Link href="/login">
              <Button
                size="sm"
                variant="outline"
                className="border-warning text-warning hover:bg-warning-soft text-xs whitespace-nowrap self-end sm:self-center"
              >
                Sign In as Rider
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Out For Delivery</p>
              <h3 className="text-xl font-bold mt-0.5 text-warning">{outCount}</h3>
            </div>
            <div className="p-2 bg-warning-soft  text-warning rounded-lg">
              <Truck className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Pending Run</p>
              <h3 className="text-xl font-bold mt-0.5 text-info">{assignedCount}</h3>
            </div>
            <div className="p-2 bg-info-soft  text-info rounded-lg">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Completed</p>
              <h3 className="text-xl font-bold mt-0.5 text-success">{completedCount}</h3>
            </div>
            <div className="p-2 bg-success-soft  text-success rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Cash Collected</p>
              <h3 className="text-xl font-bold font-mono mt-0.5 text-foreground">
                ৳{cashSummary.pendingHandIn.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Wallet className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex border-b overflow-x-auto no-scrollbar gap-1">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "ALL"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab("OUT")}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "OUT"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Out for Delivery ({outCount})
            </button>
            <button
              onClick={() => setActiveTab("ASSIGNED")}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "ASSIGNED"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Assigned ({assignedCount})
            </button>
            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "COMPLETED"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search recipient, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border bg-background focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Task Cards Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
            Loading assigned rider tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="text-center py-12 p-6 border-dashed">
            <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            <h3 className="font-semibold text-sm">No Delivery Tasks Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Parcels assigned to your rider profile by hub managers will appear here for delivery.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTasks.map((task) => (
              <RiderTaskCard
                key={task.id}
                task={task}
                onStartDelivery={handleStartDelivery}
                onComplete={(t) => setSelectedTaskForOtp(t)}
                onFail={(t) => setSelectedTaskForFail(t)}
                isStarting={isStarting}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTaskForOtp && (
        <DeliveryOtpModal
          task={selectedTaskForOtp}
          onClose={() => setSelectedTaskForOtp(null)}
          onSuccess={() => {
            refetchTasks();
            refetchCash();
          }}
        />
      )}

      {selectedTaskForFail && (
        <DeliveryFailModal
          task={selectedTaskForFail}
          onClose={() => setSelectedTaskForFail(null)}
          onSuccess={() => {
            refetchTasks();
          }}
        />
      )}

      {isCashModalOpen && (
        <RiderCashModal
          onClose={() => setIsCashModalOpen(false)}
          onSuccess={() => {
            refetchCash();
          }}
        />
      )}
    </div>
  );
}
