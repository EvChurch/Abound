"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

type AutomationLifecycleMode = "archive" | "delete" | "unarchive";

type AutomationLifecycleActionProps = {
  action: (formData: FormData) => void | Promise<void>;
  automationId: string;
  mode: AutomationLifecycleMode;
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
  AutomationLifecycleMode,
  { body: string; confirm: string; title: string }
>;

export function AutomationLifecycleAction({
  action,
  automationId,
  mode,
}: AutomationLifecycleActionProps) {
  const [open, setOpen] = useState(false);
  const copy = COPY[mode];
  const Icon =
    mode === "delete" ? Trash2 : mode === "archive" ? Archive : RotateCcw;

  return (
    <>
      <button
        aria-label={mode === "delete" ? copy.confirm : undefined}
        className={triggerClassName(mode)}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Icon aria-hidden="true" className="size-3.5" />
        <span className={mode === "delete" ? "sr-only" : undefined}>
          {copy.confirm}
        </span>
      </button>

      {open ? (
        <div
          aria-labelledby="communication-lifecycle-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/25 px-4"
          role="dialog"
        >
          <div className="grid w-full max-w-md gap-4 rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_18px_48px_rgba(35,32,28,0.2)]">
            <div className="grid gap-2">
              <h2
                className="text-[16px] font-semibold text-app-foreground"
                id="communication-lifecycle-title"
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
                onClick={() => setOpen(false)}
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

function triggerClassName(mode: AutomationLifecycleMode) {
  const tone =
    mode === "delete"
      ? "text-red-700 hover:border-red-300 hover:text-red-800 focus:ring-red-500/20"
      : "text-app-muted hover:border-app-accent hover:text-app-foreground focus:ring-app-accent/30";
  const shape =
    mode === "delete" ? "h-8 w-8 justify-center px-0" : "min-h-8 gap-1.5 px-3";

  return `inline-flex cursor-pointer items-center rounded-[6px] border border-app-border bg-app-surface text-[12px] font-semibold focus:outline-none focus:ring-2 ${shape} ${tone}`;
}

function confirmClassName(mode: AutomationLifecycleMode) {
  if (mode === "delete") {
    return "inline-flex min-h-9 cursor-pointer items-center rounded-[6px] bg-red-700 px-3 text-[12px] font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/30";
  }

  return "inline-flex min-h-9 cursor-pointer items-center rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30";
}
