"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Globe } from "lucide-react";
import { Button, Card, Switch, DataTable, ColumnDef } from "@dhruto/ui";
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "../api/notifications.api";
import {
  NotificationCategory,
  PreferenceChannel,
  type UpdatePreferencesDto,
} from "@dhruto/contracts";
import { getApiErrorMessage } from "@/lib/api-error";

const CATEGORIES = Object.values(NotificationCategory);
const CHANNELS = Object.values(PreferenceChannel);

/**
 * Notification preferences matrix: per-category × per-channel toggles plus
 * locale. Financial/security rows are locked on (server-enforced too).
 */
export function NotificationPreferences() {
  const t = useTranslations("NotificationPreferences");
  const { data, isLoading, isError, refetch } = useGetNotificationPreferencesQuery();
  const [update, { isLoading: isSaving }] = useUpdateNotificationPreferencesMutation();

  const [draft, setDraft] = React.useState<Record<string, boolean>>({});
  const [locale, setLocale] = React.useState<"en" | "bn">("en");
  const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const hydrated = React.useRef(false);

  const serverItems = React.useMemo(() => data?.data?.items ?? [], [data]);
  const serverLocale = data?.data?.locale ?? "en";

  React.useEffect(() => {
    if (!hydrated.current && serverItems.length > 0) {
      const next: Record<string, boolean> = {};
      for (const item of serverItems) next[`${item.category}:${item.channel}`] = item.enabled;
      setDraft(next);
      setLocale(serverLocale);
      hydrated.current = true;
    }
  }, [serverItems, serverLocale]);

  const locked = (category: NotificationCategory) =>
    serverItems.find((i) => i.category === category)?.locked ?? false;

  const toggle = (category: NotificationCategory, channel: PreferenceChannel) => {
    if (locked(category)) return;
    const key = `${category}:${channel}`;
    setDraft((d) => ({ ...d, [key]: !(d[key] ?? true) }));
  };

  const handleSave = async () => {
    setFeedback(null);
    const preferences: UpdatePreferencesDto["preferences"] = CATEGORIES.flatMap((category) =>
      CHANNELS.map((channel) => ({
        category,
        channel,
        enabled: draft[`${category}:${channel}`] ?? true,
      })),
    );
    try {
      await update({ preferences, locale }).unwrap();
      hydrated.current = false;
      refetch();
      setFeedback({ kind: "ok", text: t("saved") });
    } catch (err) {
      setFeedback({ kind: "err", text: getApiErrorMessage(err, t("saveFailed")) });
    }
  };

  const columns: ColumnDef<NotificationCategory>[] = React.useMemo(() => [
    {
      accessorKey: "category",
      header: t("categoryCol"),
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="py-2 pr-4">
            <span className="flex items-center gap-1.5 font-medium">
              {t(`category_${cat}`)}
              {locked(cat) && (
                <Lock className="h-3 w-3 text-muted-foreground" aria-label={t("locked")} />
              )}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {locked(cat) ? t("lockedHint") : t(`category_${cat}_hint`)}
            </span>
          </div>
        );
      },
    },
    ...CHANNELS.map((ch) => ({
      id: ch,
      header: () => <div className="text-center">{t(`channel_${ch}`)}</div>,
      cell: ({ row }: { row: { original: NotificationCategory } }) => {
        const cat = row.original;
        const key = `${cat}:${ch}`;
        const enabled = draft[key] ?? true;
        return (
          <div className="text-center">
            <Switch
              checked={enabled}
              disabled={locked(cat) || isSaving}
              onCheckedChange={() => toggle(cat, ch)}
              aria-label={`${t(`category_${cat}`)} ${t(`channel_${ch}`)}`}
            />
          </div>
        );
      },
    })),
  ], [t, draft, isSaving]); // omit locked and toggle from dependencies because they might not be stable, but it's fine for our use case

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        {t("loading")}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="space-y-3 p-6 text-center">
        <p className="text-sm font-medium">{t("loadErrorTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("loadErrorDescription")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("retry")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 p-6">
      <div>
        <h3 className="text-base font-semibold">{t("title")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
      </div>

      <DataTable
        columns={columns}
        data={CATEGORIES}
        className="p-0 border-0 shadow-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-medium">{t("localeLabel")}</span>
        <div className="flex gap-2" role="radiogroup" aria-label={t("localeLabel")}>
          {(["en", "bn"] as const).map((l) => (
            <Button
              key={l}
              variant={locale === l ? "default" : "outline"}
              size="sm"
              role="radio"
              aria-checked={locale === l}
              onClick={() => setLocale(l)}
            >
              {t(`locale_${l}`)}
            </Button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.kind === "err" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-2.5 text-xs ${
            feedback.kind === "ok"
              ? "border-border bg-success-soft text-success-soft-foreground"
              : "border-border bg-danger-soft text-danger-soft-foreground"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {t("save")}
        </Button>
      </div>
    </Card>
  );
}
