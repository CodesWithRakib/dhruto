"use client";

import React from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
} from "@dhruto/ui";
import {
  Phone,
  MapPin,
  Package,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  ExternalLink,
} from "lucide-react";
import { type RiderTaskItem } from "@dhruto/contracts";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";

interface RiderTaskCardProps {
  task: RiderTaskItem;
  onStartDelivery: (id: string) => void;
  onComplete: (task: RiderTaskItem) => void;
  onFail: (task: RiderTaskItem) => void;
  isStarting?: boolean;
}

export function RiderTaskCard({
  task,
  onStartDelivery,
  onComplete,
  onFail,
  isStarting = false,
}: RiderTaskCardProps) {
  const copyTracking = () => {
    navigator.clipboard.writeText(task.trackingCode);
    toast.success(`Copied ${task.trackingCode}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED_TO_RIDER":
        return <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50 text-[11px]">Ready for Pickup</Badge>;
      case "OUT_FOR_DELIVERY":
        return <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 text-[11px] animate-pulse">Out for Delivery</Badge>;
      case "DELIVERED":
      case "CASH_PENDING":
        return <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50 text-[11px]">Delivered</Badge>;
      case "DELIVERY_ATTEMPTED":
        return <Badge variant="outline" className="border-rose-400 text-rose-600 bg-rose-50 text-[11px]">Attempt Failed</Badge>;
      case "RESCHEDULED":
        return <Badge variant="outline" className="border-purple-400 text-purple-600 bg-purple-50 text-[11px]">Rescheduled</Badge>;
      default:
        return <Badge variant="secondary" className="text-[11px]">{status}</Badge>;
    }
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${task.deliveryAddress}, ${task.thana || ""}, ${task.district || ""}, Bangladesh`,
  )}`;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow border-muted">
      <CardContent className="p-4 space-y-3">
        {/* Top: Tracking code + Status */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span>{task.trackingCode}</span>
            <button
              onClick={copyTracking}
              className="text-muted-foreground hover:text-foreground p-0.5"
              title="Copy tracking code"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          {getStatusBadge(task.status)}
        </div>

        {/* Recipient Details */}
        <div className="space-y-1">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-sm text-foreground">{task.recipientName}</h4>
            {task.codAmount > 0 ? (
              <Badge className="bg-amber-600 text-white font-mono font-bold text-xs">
                COD: ৳{task.codAmount.toLocaleString()}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500 text-emerald-600 text-[10px]">
                Prepaid
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{task.deliveryAddress}</span>
          </p>
          {(task.thana || task.district) && (
            <p className="text-[11px] text-muted-foreground pl-4">
              {task.thana ? `${task.thana}, ` : ""}{task.district || ""}
            </p>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2">
          {/* Communication Links */}
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${task.recipientPhone}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium bg-muted/30 hover:bg-muted transition-colors text-foreground"
            >
              <Phone className="h-3 w-3 text-emerald-600" />
              Call
            </a>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium bg-muted/30 hover:bg-muted transition-colors text-foreground"
            >
              <Navigation className="h-3 w-3 text-blue-600" />
              Maps
            </a>

            <Link
              href={`/track/${task.trackingCode}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
              title="Track Publicly"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Workflow Transitions */}
          <div className="flex items-center gap-2">
            {(task.status === "ASSIGNED_TO_RIDER" ||
              task.status === "DELIVERY_ATTEMPTED" ||
              task.status === "RESCHEDULED") && (
              <Button
                size="sm"
                onClick={() => onStartDelivery(task.id)}
                disabled={isStarting}
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="h-3.5 w-3.5" />
                Start Delivery
              </Button>
            )}

            {task.status === "OUT_FOR_DELIVERY" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFail(task)}
                  className="h-8 text-xs border-amber-400 text-amber-600 hover:bg-amber-50 gap-1"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Issue
                </Button>

                <Button
                  size="sm"
                  onClick={() => onComplete(task)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Deliver
                </Button>
              </>
            )}

            {(task.status === "DELIVERED" || task.status === "CASH_PENDING") && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Delivered
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
