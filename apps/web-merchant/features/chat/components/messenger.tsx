"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessagesSquare } from "lucide-react";
import { Button, cn } from "@dhruto/ui";
import { Link } from "@/lib/navigation";
import { useAppSelector } from "@/store/hooks";
import { EmptyState, NotFoundState } from "@/components/feedback/states";
import { ChatRealtimeProvider } from "../realtime/chat-realtime-provider";
import { messengerRoutes, type MessengerSection } from "../lib/routes";
import { ConnectionBanner } from "./chat-primitives";
import { ConversationPanel } from "./conversation-panel";
import { ConversationSidebar } from "./conversation-sidebar";
import { OpenConversationButton } from "./open-conversation-button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Messenger shell, rendered by `messages/layout.tsx` so it stays mounted while
 * the URL switches between `/messages` and `/messages/<id>` (one socket, warm
 * caches, back/forward and refresh restore the selected conversation).
 *
 * Responsive:
 *  - mobile (< md): list OR conversation, full height, back button returns;
 *  - tablet (md..xl): list + conversation, info panel as a drawer;
 *  - desktop (>= xl): list + conversation + inline info panel.
 * Authentication is enforced by the surrounding DashboardShell guard and,
 * authoritatively, by the backend on every request.
 */
export function Messenger({ section }: { section: MessengerSection }) {
  const params = useParams<{ conversationId?: string | string[] }>();
  const raw = params.conversationId;
  const activeId = typeof raw === "string" ? raw : null;
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const routes = useMemo(() => messengerRoutes(section), [section]);
  const [infoOpen, setInfoOpen] = useState(false);

  if (!userId) return null;

  return (
    <ChatRealtimeProvider>
      <div
        className={cn(
          "-mx-4 -mt-6 flex h-[calc(100dvh-11rem)] flex-col overflow-hidden bg-surface sm:-mx-6",
          "lg:mx-0 lg:mt-0 lg:h-[calc(100dvh-7rem)] lg:rounded-2xl lg:border lg:border-border",
        )}
      >
        <ConnectionBanner />
        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              "min-h-0 w-full flex-col border-border md:flex md:w-80 md:border-e lg:w-96",
              activeId ? "hidden" : "flex",
            )}
          >
            <ConversationSidebar
              routes={routes}
              activeId={activeId}
              myUserId={userId}
              headerAction={
                section === "merchant" ? (
                  <OpenConversationButton target={{ kind: "merchantDesk" }} variant="soft" />
                ) : undefined
              }
            />
          </aside>
          <section className={cn("min-h-0 min-w-0 flex-1 flex-col", activeId ? "flex" : "hidden md:flex")}>
            {activeId === null ? (
              <SelectConversationPrompt />
            ) : !UUID.test(activeId) ? (
              <UnavailableConversation listHref={routes.list} />
            ) : (
              <Suspense fallback={null}>
                <ConversationPanel
                  key={activeId}
                  conversationId={activeId}
                  myUserId={userId}
                  routes={routes}
                  section={section}
                  infoOpen={infoOpen}
                  onInfoOpenChange={setInfoOpen}
                />
              </Suspense>
            )}
          </section>
        </div>
      </div>
    </ChatRealtimeProvider>
  );
}

function SelectConversationPrompt() {
  const t = useTranslations("Chat");
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState icon={MessagesSquare} title={t("selectConversationTitle")} description={t("selectConversationDescription")} />
    </div>
  );
}

function UnavailableConversation({ listHref }: { listHref: string }) {
  const t = useTranslations("Chat");
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <NotFoundState
        title={t("conversationUnavailable")}
        description={t("conversationUnavailableDescription")}
        action={
          <Button asChild variant="outline">
            <Link href={listHref}>{t("backToList")}</Link>
          </Button>
        }
      />
    </div>
  );
}

/** Server-compatible layout wrapper for `messages/layout.tsx` route files. */
export function MessengerLayout({ section, children }: { section: MessengerSection; children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <Messenger section={section} />
      </Suspense>
      {children}
    </>
  );
}
