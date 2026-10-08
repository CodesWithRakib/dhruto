"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import {
  Bell,
  CheckCheck,
  Loader2,
  Truck,
  Wallet,
  Info,
  Smartphone,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Button, Badge, Card, ListSkeleton } from "@dhruto/ui";
import {
  useGetMyNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from "../api/notifications.api";
import { NotificationChannel, NotificationType } from "@dhruto/contracts";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, RetryButton } from "@/components/feedback/states";
import { getApiErrorMessage } from "@/lib/api-error";
import { useFormatters } from "@/lib/format";

const PAGE_SIZE = 20;

/** Resolves a safe in-app route for a notification's metadata. */
function resolveRoute(metadata: Record<string, unknown> | undefined): string | null {
  const route = metadata?.route;
  if (typeof route !== "string" || route.length === 0) return null;
  // Only allow known in-app destinations — never open redirects or externals.
  if (
    route.startsWith("/merchant/parcels/") ||
    route.startsWith("/merchant/finance") ||
    route.startsWith("/rider/tasks/") ||
    route.startsWith("/rider/profile") ||
    route.startsWith("/hub/cash") ||
    route === "/merchant/parcels" ||
    route === "/merchant/finance"
  ) {
    return route;
  }
  return null;
}

function TypeIcon({ type }: { type: string }) {
  if (type === NotificationType.CASH_COLLECTED || type === NotificationType.PAYOUT_UPDATE) {
    return <Wallet className="h-4 w-4 text-success-soft-foreground" aria-hidden="true" />;
  }
  if (type === NotificationType.DELIVERY_OTP || type === NotificationType.PARCEL_STATUS_UPDATE) {
    return <Truck className="h-4 w-4 text-info-soft-foreground" aria-hidden="true" />;
  }
  return <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === NotificationChannel.SMS) {
    return <Smartphone className="h-3.5 w-3.5 text-info-soft-foreground" aria-label="SMS" />;
  }
  if (channel === NotificationChannel.EMAIL) {
    return <Mail className="h-3.5 w-3.5 text-info-soft-foreground" aria-label="Email" />;
  }
  return <Bell className="h-3.5 w-3.5 text-primary-soft-foreground" aria-label="In-app" />;
}

/**
 * Reusable notification center: paginated list, unread filter, mark read,
 * mark-all-read, safe deep-linking, and full loading/empty/error states.
 * Used by merchant, rider, hub and admin routes with role-appropriate copy.
 */
export function NotificationCenter() {
  const t = useTranslations("Notifications");
  const { dateTime } = useFormatters();
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetMyNotificationsQuery({
    page,
    limit: PAGE_SIZE,
    unreadOnly,
  });
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAll, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const payload = data?.data;
  const items = payload?.items ?? [];
  const total = payload?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleOpen = (id: string, status: string, metadata?: Record<string, unknown>) => {
    setActionError(null);
    const route = resolveRoute(metadata);
    // Navigate first for instant feedback; the read-receipt follows in the
    // background. Read state is non-financial and the list refetches, so a
    // failure self-corrects without ever showing false state.
    if (route) router.push(route as never);
    if (status !== "READ") {
      setPendingId(id);
      markAsRead(id)
        .unwrap()
        .catch((err: unknown) => {
          // Only visible when staying on this page (no navigation happened).
          if (!route) setActionError(getApiErrorMessage(err, t("markReadFailed")));
        })
        .finally(() => {
          setPendingId((current) => (current === id ? null : current));
        });
    }
  };

  const handleMarkAll = async () => {
    setActionError(null);
    try {
      await markAll().unwrap();
      refetch();
    } catch (err) {
      setActionError(getApiErrorMessage(err, t("markAllFailed")));
    }
  };

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 gap-2">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAll}
              disabled={isMarkingAll || items.length === 0}
              className="h-9 gap-2"
            >
              {isMarkingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {t("markAllRead")}
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2" role="group" aria-label={t("filterLabel")}>
        <Button
          variant={!unreadOnly ? "default" : "outline"}
          size="sm"
          aria-pressed={!unreadOnly}
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
        >
          {t("filterAll")}
        </Button>
        <Button
          variant={unreadOnly ? "default" : "outline"}
          size="sm"
          aria-pressed={unreadOnly}
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
        >
          {t("filterUnread")}
        </Button>
        {total > 0 && (
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            {t("totalCount", { count: total })}
          </span>
        )}
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
        >
          {actionError}
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
      <Card className="divide-y divide-border/50 overflow-hidden">
        {isError ? (
          <ErrorState
            title={t("loadErrorTitle")}
            description={t("loadErrorDescription")}
            action={<RetryButton label={t("retry")} onRetry={() => refetch()} />}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={t("noNotifications")}
            description={t("emptyHint")}
            icon={Bell}
          />
        ) : (
          items.map((item) => {
            const isUnread = item.status !== "READ";
            const isPending = pendingId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpen(item.id, item.status, item.metadata)}
                disabled={isPending}
                className={`flex w-full gap-3 p-4 text-left transition-colors duration-fast ease-out hover:bg-surface-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset disabled:opacity-60 ${
                  isUnread ? "bg-primary-soft/40" : ""
                }`}
                aria-label={`${item.title} — ${isUnread ? t("unread") : t("read")}`}
              >
                <div className="mt-0.5 h-fit rounded-lg border border-border/70 bg-surface p-1.5">
                  <TypeIcon type={item.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <ChannelIcon channel={item.channel} />
                      <span className="text-[10px] text-muted-foreground">{item.channel}</span>
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                    {item.message}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] tabular-nums text-muted-foreground/70">
                      {dateTime(item.createdAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                      ) : isUnread ? (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          {t("unread")}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">{t("read")}</span>
                      )}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(next) => setPage(next)}
        />
      )}
    </div>
  );
}
