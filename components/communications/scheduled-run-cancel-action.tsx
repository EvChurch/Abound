"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

import { cancelCommunicationAutomationRunAction } from "@/app/communications/actions";
import { ActionTooltip } from "@/components/ui/action-tooltip";

type ScheduledRunCancelActionProps = {
  automationId: string;
  runId: string;
};

export function ScheduledRunCancelAction({
  automationId,
  runId,
}: ScheduledRunCancelActionProps) {
  const [open, setOpen] = useState(false);
  const dialog = open ? (
    <div
      aria-labelledby="scheduled-run-cancel-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/25 px-4"
      role="dialog"
    >
      <div className="grid w-full max-w-md gap-4 rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_18px_48px_rgba(35,32,28,0.2)]">
        <div className="grid gap-2">
          <h2
            className="text-[16px] font-semibold text-app-foreground"
            id="scheduled-run-cancel-title"
          >
            Discard scheduled run?
          </h2>
          <p className="text-[13px] leading-6 text-app-muted">
            Discarding removes this scheduled send before it goes out. Anyone
            marked as permanently excluded will stay excluded and will not be
            added back into future schedules.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="inline-flex min-h-9 cursor-pointer items-center rounded-[6px] border border-app-border bg-app-surface px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            onClick={() => setOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <form action={cancelCommunicationAutomationRunAction}>
            <input name="automationId" type="hidden" value={automationId} />
            <input name="runId" type="hidden" value={runId} />
            <button
              className="inline-flex min-h-9 cursor-pointer items-center rounded-[6px] bg-red-700 px-3 text-[12px] font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              type="submit"
            >
              Discard
            </button>
          </form>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <ActionTooltip label="Discard run">
        <button
          aria-label="Discard run"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] border border-app-border bg-app-background text-app-muted hover:border-rose-300 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </ActionTooltip>

      {dialog && typeof document !== "undefined"
        ? createPortal(dialog, document.body)
        : dialog}
    </>
  );
}
