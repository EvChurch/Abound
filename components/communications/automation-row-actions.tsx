"use client";

import {
  Archive,
  Ellipsis,
  Eye,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DropdownPanel } from "@/components/ui/dropdown-panel";

type AutomationRowActionMode = "archive" | "delete" | "unarchive";

type AutomationRowActionsProps = {
  action: (formData: FormData) => void | Promise<void>;
  automationId: string;
  automationName: string;
  mode: AutomationRowActionMode;
};

const COPY = {
  archive: {
    body: "Archiving stops this workflow from sending again. Existing scheduled runs, recipients, and delivery history stay available for reference.",
    confirm: "Archive",
    title: "Archive communication?",
  },
  delete: {
    body: "Deleting removes this workflow immediately.",
    confirm: "Delete",
    title: "Delete communication?",
  },
  unarchive: {
    body: "Unarchiving makes this workflow available for scheduled sending again.",
    confirm: "Unarchive",
    title: "Unarchive communication?",
  },
} satisfies Record<
  AutomationRowActionMode,
  { body: string; confirm: string; title: string }
>;

export function AutomationRowActions({
  action,
  automationId,
  automationName,
  mode,
}: AutomationRowActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const copy = COPY[mode];
  const LifecycleIcon =
    mode === "delete" ? Trash2 : mode === "archive" ? Archive : RotateCcw;

  return (
    <>
      <DropdownPanel
        align="right"
        panelClassName="grid gap-1 rounded-[8px] border border-app-border bg-app-surface p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
        portal
        side="bottom"
        trigger={
          <>
            <span className="sr-only">
              Workflow actions for {automationName}
            </span>
            <Ellipsis aria-hidden="true" className="size-4" />
          </>
        }
        triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-transparent bg-transparent text-app-muted opacity-0 outline-none transition hover:border-app-border hover:bg-app-chip hover:text-app-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-app-accent/25 group-hover:opacity-100 group-focus-within:opacity-100"
        widthClassName="w-44"
      >
        <Link
          className={menuItemClassName()}
          href={`/communications/${automationId}`}
        >
          <Eye aria-hidden="true" className="size-3.5" />
          View
        </Link>
        <Link
          className={menuItemClassName()}
          href={`/communications/${automationId}/edit`}
        >
          <Pencil aria-hidden="true" className="size-3.5" />
          Edit
        </Link>
        <button
          className={menuItemClassName(
            mode === "delete" ? "danger" : "default",
          )}
          onClick={() => setConfirming(true)}
          type="button"
        >
          <LifecycleIcon aria-hidden="true" className="size-3.5" />
          {copy.confirm}
        </button>
      </DropdownPanel>

      {confirming ? (
        <div
          aria-labelledby={`communication-row-action-${automationId}`}
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/25 px-4"
          role="dialog"
        >
          <div className="grid w-full max-w-md gap-4 rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_18px_48px_rgba(35,32,28,0.2)]">
            <div className="grid gap-2">
              <h2
                className="text-[16px] font-semibold text-app-foreground"
                id={`communication-row-action-${automationId}`}
              >
                {copy.title}
              </h2>
              <p className="text-[13px] leading-6 text-app-muted">
                {copy.body}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="inline-flex min-h-9 cursor-pointer items-center rounded-[6px] border border-app-border bg-app-surface px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                onClick={() => setConfirming(false)}
                type="button"
              >
                Cancel
              </button>
              <form action={action}>
                <input name="id" type="hidden" value={automationId} />
                <button className={confirmClassName(mode)} type="submit">
                  {copy.confirm}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function menuItemClassName(tone: "danger" | "default" = "default") {
  const toneClassName =
    tone === "danger"
      ? "text-red-700 hover:bg-red-50 hover:text-red-800"
      : "text-app-muted hover:bg-app-soft hover:text-app-foreground";

  return `flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-[6px] px-2.5 text-left text-[12.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25 ${toneClassName}`;
}

function confirmClassName(mode: AutomationRowActionMode) {
  if (mode === "delete") {
    return "inline-flex min-h-9 cursor-pointer items-center rounded-[6px] bg-red-700 px-3 text-[12px] font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/30";
  }

  return "inline-flex min-h-9 cursor-pointer items-center rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30";
}
