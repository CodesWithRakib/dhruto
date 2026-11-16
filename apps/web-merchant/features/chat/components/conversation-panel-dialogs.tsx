"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { type TimelineMessage } from "../lib/timeline";
import { useMessageActions } from "../hooks/use-message-actions";
import { EditMessageDialog, RemoveMessageDialog, ReportMessageDialog } from "./message-dialogs";

export function ConversationPanelDialogs({
  editing,
  setEditing,
  deleting,
  setDeleting,
  removing,
  setRemoving,
  reporting,
  setReporting,
  actions,
}: {
  editing: TimelineMessage | null;
  setEditing: (msg: TimelineMessage | null) => void;
  deleting: TimelineMessage | null;
  setDeleting: (msg: TimelineMessage | null) => void;
  removing: TimelineMessage | null;
  setRemoving: (msg: TimelineMessage | null) => void;
  reporting: TimelineMessage | null;
  setReporting: (msg: TimelineMessage | null) => void;
  actions: ReturnType<typeof useMessageActions>;
}) {
  const t = useTranslations("Chat");

  return (
    <>
      {editing && (
        <EditMessageDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          initialContent={editing.content ?? ""}
          onSubmit={(content) => (editing.id ? actions.edit(editing.id, content) : Promise.resolve(false))}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        tone="danger"
        onConfirm={async () => {
          if (deleting?.id) await actions.deleteOwn(deleting.id);
          setDeleting(null);
        }}
      />
      <RemoveMessageDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        onSubmit={(reason) => (removing?.id ? actions.removeAsModerator(removing.id, reason) : Promise.resolve(false))}
      />
      <ReportMessageDialog
        open={reporting !== null}
        onOpenChange={(open) => !open && setReporting(null)}
        onSubmit={(reason, details) => (reporting?.id ? actions.report(reporting.id, reason, details) : Promise.resolve(false))}
      />
    </>
  );
}
