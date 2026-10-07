"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import { AlertTriangle } from "lucide-react";
import { ExceptionStatus } from "@dhruto/contracts";
import { useGetExceptionsQuery, useResolveExceptionMutation } from "../api/hubs.api";
import { getApiErrorMessage } from "@/lib/api-error";
import { EmptyState } from "@/components/feedback/states";
import { toast } from "sonner";
import { useFormatters } from "@/lib/format";
import { EnumBadge } from "@/components/data-display/enum-badge";
import { EXCEPTION_STATUS_TONE } from "@/config/status";

interface ExceptionsViewProps {
  currentHubId: string;
}

/** Operational exceptions with a controlled resolve workflow. */
export function ExceptionsView({ currentHubId }: ExceptionsViewProps) {
  const t = useTranslations("Hub");
  const { dateTime } = useFormatters();
  const [statusFilter, setStatusFilter] = React.useState<ExceptionStatus | "ALL">(
    ExceptionStatus.OPEN,
  );
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState("");

  const { data, isLoading, refetch } = useGetExceptionsQuery({
    hubId: currentHubId,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const [resolveMutation, { isLoading: isResolving }] = useResolveExceptionMutation();

  const exceptions = data?.data ?? [];

  const handleResolve = async () => {
    if (!resolvingId) return;
    if (resolutionNote.trim().length < 3) {
      toast.error(t("exceptions.resolutionRequired"));
      return;
    }
    try {
      const res = await resolveMutation({
        exceptionId: resolvingId,
        resolution: { resolutionNote: resolutionNote.trim() },
      }).unwrap();
      if (res.success) {
        toast.success(t("exceptions.resolved"));
        setResolvingId(null);
        setResolutionNote("");
        refetch();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("exceptions.resolve")));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={statusFilter === ExceptionStatus.OPEN ? "default" : "outline"}
          onClick={() => setStatusFilter(ExceptionStatus.OPEN)}
          className="h-8 text-xs"
        >
          {ExceptionStatus.OPEN}
        </Button>
        <Button
          size="sm"
          variant={statusFilter === ExceptionStatus.RESOLVED ? "default" : "outline"}
          onClick={() => setStatusFilter(ExceptionStatus.RESOLVED)}
          className="h-8 text-xs"
        >
          {ExceptionStatus.RESOLVED}
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "ALL" ? "default" : "outline"}
          onClick={() => setStatusFilter("ALL")}
          className="h-8 text-xs"
        >
          ALL ({exceptions.length})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p role="status" className="p-8 text-center text-xs text-muted-foreground">
              {t("loading")}
            </p>
          ) : exceptions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={AlertTriangle}
                title={t("exceptions.empty")}
                description={t("exceptions.emptyDescription")}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {exceptions.map((exception) => (
                <li key={exception.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                    <span className="font-mono text-xs font-bold text-foreground">
                      {exception.type}
                    </span>
                    <Badge
                      variant={
                        exception.status === ExceptionStatus.OPEN ? "destructive" : "success"
                      }
                      className="text-[10px]"
                    >
                      {
                        <EnumBadge
                          namespace="ExceptionStatus"
                          value={exception.status}
                          tones={EXCEPTION_STATUS_TONE}
                        />
                      }
                    </Badge>
                    <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                      {dateTime(exception.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{exception.description}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {[exception.trackingCode, exception.bagCode, exception.manifestCode]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span>
                      {t("exceptions.raisedBy")}: {exception.raisedByName ?? "—"}
                    </span>
                    {exception.resolvedByName ? (
                      <span>
                        {t("exceptions.resolvedBy")}: {exception.resolvedByName}
                      </span>
                    ) : null}
                    {exception.status === ExceptionStatus.OPEN ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto h-8 text-xs"
                        onClick={() => {
                          setResolvingId(exception.id);
                          setResolutionNote("");
                        }}
                      >
                        {t("exceptions.resolve")}
                      </Button>
                    ) : null}
                  </div>
                  {exception.resolutionNote ? (
                    <p className="rounded-lg bg-surface-muted p-2 text-[11px] text-muted-foreground">
                      {exception.resolutionNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolvingId !== null} onOpenChange={(open) => !open && setResolvingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("exceptions.resolve")}</DialogTitle>
            <DialogDescription>{t("exceptions.resolutionNote")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label
              htmlFor="resolution-note"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("exceptions.resolutionNote")} *
            </label>
            <textarea
              id="resolution-note"
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
              placeholder={t("exceptions.resolutionNotePlaceholder")}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm outline-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResolvingId(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleResolve} disabled={isResolving}>
              {isResolving ? t("exceptions.resolving") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
