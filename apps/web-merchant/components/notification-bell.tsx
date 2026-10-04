"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Smartphone,
  Mail,
  Truck,
  Wallet,
  Clock,
  Send,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { Badge, Button } from "@dhruto/ui";
import {
  useGetUnreadNotificationCountQuery,
  useGetMyNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useTestSmsNotificationMutation,
} from "../features/notifications/api/notifications.api";
import { NotificationChannel, NotificationType } from "@dhruto/contracts";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [testPhone, setTestPhone] = useState("01712345678");
  const [testMessage, setTestMessage] = useState("Dhruto Express: Your order #DHR-9821 is out for delivery with rider.");
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: countData, refetch: refetchCount } = useGetUnreadNotificationCountQuery(undefined, {
    pollingInterval: 15000,
  });
  const { data: notifsData, isLoading, refetch: refetchNotifs } = useGetMyNotificationsQuery(
    { limit: 15 },
    { skip: !isOpen },
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();
  const [testSms, { isLoading: isSendingSms }] = useTestSmsNotificationMutation();

  const unreadCount = countData?.data?.unreadCount || 0;
  const notifications = notifsData?.data || [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      refetchNotifs();
    }
  };

  const handleMarkAsRead = async (id: string, currentStatus: string) => {
    if (currentStatus === "READ") return;
    try {
      await markAsRead(id).unwrap();
      refetchCount();
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead().unwrap();
      refetchCount();
      refetchNotifs();
    } catch {
      // Ignore
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsFeedback(null);
    try {
      const res = await testSms({ phone: testPhone, message: testMessage }).unwrap();
      setSmsFeedback(`SMS sent to ${res.data?.recipientTarget || testPhone} successfully!`);
      refetchCount();
      setTimeout(() => {
        setShowSmsModal(false);
        setSmsFeedback(null);
      }, 2000);
    } catch (err: any) {
      setSmsFeedback(`Failed: ${err?.data?.message || "Could not dispatch SMS"}`);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case NotificationChannel.SMS:
        return <Smartphone className="h-3.5 w-3.5 text-blue-500" />;
      case NotificationChannel.EMAIL:
        return <Mail className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case NotificationType.CASH_COLLECTED:
      case NotificationType.PAYOUT_UPDATE:
        return <Wallet className="h-4 w-4 text-emerald-500" />;
      case NotificationType.DELIVERY_OTP:
      case NotificationType.PARCEL_STATUS_UPDATE:
        return <Truck className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        aria-label="View notifications"
        id="notification-bell-btn"
        className="relative p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-card text-card-foreground shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowSmsModal(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border rounded px-1.5 py-0.5 hover:bg-muted"
                title="Send test SMS"
              >
                <Smartphone className="h-3 w-3 text-blue-500" />
                Test SMS
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground px-4">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  Parcel status alerts, OTPs, and payout updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = item.status !== "READ";
                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id, item.status)}
                    className={`p-3.5 hover:bg-muted/50 cursor-pointer transition-colors relative flex gap-3 ${
                      isUnread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-card border shadow-xs h-fit">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {getChannelIcon(item.channel)}
                          <span className="text-[10px] text-muted-foreground">
                            {item.channel}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        {isUnread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Test SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border shadow-2xl rounded-2xl max-w-md w-full p-5 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowSmsModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Simulated BD SMS Gateway</h3>
                <p className="text-xs text-muted-foreground">
                  Test SMS formatting with Bangladeshi phone normalization (+8801...)
                </p>
              </div>
            </div>

            <form onSubmit={handleSendTestSms} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Recipient Phone (Bangladesh)
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  required
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-[11px] text-muted-foreground">
                  Accepts 017..., 88017..., or +88017...
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  SMS Message Body
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  required
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-[11px] text-muted-foreground">
                  {testMessage.length} characters · {Math.ceil(testMessage.length / 160) || 1} SMS part(s)
                </span>
              </div>

              {smsFeedback && (
                <div
                  className={`text-xs p-2.5 rounded-lg border ${
                    smsFeedback.startsWith("SMS sent")
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {smsFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSmsModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSendingSms}
                  className="flex items-center gap-1.5"
                >
                  {isSendingSms ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Dispatch SMS
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
