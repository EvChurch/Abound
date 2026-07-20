"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  completeCommunicationAutomationRunReviewAction,
  sendCommunicationAutomationRunNowAction,
  updateAutomationRecipientReviewDecisionInlineAction,
} from "@/app/communications/actions";
import { ScheduledRunCancelAction } from "@/components/communications/scheduled-run-cancel-action";
import { ActionTooltip } from "@/components/ui/action-tooltip";

export type ReviewRecipientDecision = {
  defaultDecision: string;
  disabled: boolean;
  id: string;
  mobileSummary: {
    href: string;
    name: string;
    photoUrl: string | null;
    secondary: string;
  };
  personRockId: number;
  previewHref: string;
};

type AutomationReviewDecisionRailProps = {
  children: React.ReactNode;
  recipients: ReviewRecipientDecision[];
};

export function AutomationReviewDecisionRail({
  children,
  recipients,
}: AutomationReviewDecisionRailProps) {
  const [decisionOverrides, setDecisionOverrides] = useState<
    Record<string, ReviewDecision>
  >({});
  const [isPending, startTransition] = useTransition();

  function saveDecision(recipientId: string, nextDecision: ReviewDecision) {
    setDecisionOverrides((current) => ({
      ...current,
      [recipientId]: nextDecision,
    }));
    startTransition(async () => {
      await updateAutomationRecipientReviewDecisionInlineAction({
        decision: nextDecision,
        recipientId,
      });
    });
  }

  return (
    <>
      <div className="grid gap-3 bg-app-background p-3 md:hidden">
        {recipients.map((recipient) => {
          const decision =
            decisionOverrides[recipient.id] ?? recipient.defaultDecision;

          return (
            <article
              className="grid gap-3 rounded-[7px] border border-app-border bg-app-surface p-3 shadow-[0_1px_2px_rgba(150,140,120,0.14)]"
              key={recipient.id}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <MobileRecipientAvatar
                  name={recipient.mobileSummary.name}
                  photoUrl={recipient.mobileSummary.photoUrl}
                />
                <div className="grid min-w-0 gap-1">
                  <Link
                    className="truncate font-semibold leading-tight text-app-accent"
                    href={recipient.mobileSummary.href}
                  >
                    {recipient.mobileSummary.name}
                  </Link>
                  <div className="truncate text-[12px] leading-5 text-app-muted">
                    {recipient.mobileSummary.secondary}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-app-border pt-3">
                <div className="flex items-center gap-2">
                  <RecipientSendControl
                    decision={decision}
                    disabled={recipient.disabled || isPending}
                    onChange={(decision) =>
                      saveDecision(recipient.id, decision)
                    }
                  />
                  <span className="text-[12px] font-semibold text-app-foreground">
                    Send
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <RecipientPreviewAction previewHref={recipient.previewHref} />
                  <PermanentExcludeAction
                    disabled={
                      recipient.disabled ||
                      isPending ||
                      decision === "PERMANENTLY_EXCLUDE"
                    }
                    isExcluded={decision === "PERMANENTLY_EXCLUDE"}
                    onConfirm={() =>
                      saveDecision(recipient.id, "PERMANENTLY_EXCLUDE")
                    }
                    recipientId={recipient.id}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden grid-cols-[96px_minmax(0,1fr)_88px] bg-app-surface md:grid sm:grid-cols-[116px_minmax(0,1fr)_88px]">
        <div className="grid border-r border-app-border bg-app-background/45">
          {recipients.map((recipient) => (
            <div
              className="flex min-h-[84px] items-center border-b border-app-border px-3 last:border-b-0"
              key={recipient.id}
            >
              <RecipientSendControl
                decision={
                  decisionOverrides[recipient.id] ?? recipient.defaultDecision
                }
                disabled={recipient.disabled || isPending}
                onChange={(decision) => saveDecision(recipient.id, decision)}
              />
            </div>
          ))}
        </div>
        <div className="min-w-0">{children}</div>
        <div className="grid border-l border-app-border bg-app-background/45">
          {recipients.map((recipient) => (
            <div
              className="flex min-h-[84px] items-center justify-center border-b border-app-border last:border-b-0"
              key={recipient.id}
            >
              <div className="flex items-center justify-center gap-1">
                <RecipientPreviewAction previewHref={recipient.previewHref} />
                <PermanentExcludeAction
                  disabled={
                    recipient.disabled ||
                    isPending ||
                    (decisionOverrides[recipient.id] ??
                      recipient.defaultDecision) === "PERMANENTLY_EXCLUDE"
                  }
                  isExcluded={
                    (decisionOverrides[recipient.id] ??
                      recipient.defaultDecision) === "PERMANENTLY_EXCLUDE"
                  }
                  onConfirm={() =>
                    saveDecision(recipient.id, "PERMANENTLY_EXCLUDE")
                  }
                  recipientId={recipient.id}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function RecipientPreviewAction({ previewHref }: { previewHref: string }) {
  return (
    <ActionTooltip label="Preview email">
      <Link
        aria-label="Preview email"
        className="inline-flex size-8 items-center justify-center rounded-[6px] text-app-muted hover:bg-app-soft hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
        href={previewHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Search aria-hidden="true" className="size-4" />
      </Link>
    </ActionTooltip>
  );
}

export function AutomationRunHeaderActions({
  automationId,
  runId,
  runStatus,
}: {
  automationId: string;
  runId: string;
  runStatus: string;
}) {
  if (runStatus === "READY_TO_SEND") {
    return (
      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
        <form action={sendCommunicationAutomationRunNowAction}>
          <input name="automationId" type="hidden" value={automationId} />
          <input name="runId" type="hidden" value={runId} />
          <button
            className="inline-flex min-h-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            type="submit"
          >
            Send now
          </button>
        </form>
        <ScheduledRunCancelAction automationId={automationId} runId={runId} />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
      <form action={completeCommunicationAutomationRunReviewAction}>
        <input name="automationId" type="hidden" value={automationId} />
        <input name="decisionsJson" type="hidden" value="[]" />
        <input name="runId" type="hidden" value={runId} />
        <button
          className="inline-flex min-h-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
          type="submit"
        >
          Ready to Send
        </button>
      </form>
      <ScheduledRunCancelAction automationId={automationId} runId={runId} />
    </div>
  );
}

export function AutomationRunStickyHeader({
  automationId,
  automationName,
  runId,
  runStatus,
  scheduledLabel,
  statusLabel,
}: {
  automationId: string;
  automationName: string;
  runId: string;
  runStatus: string;
  scheduledLabel: string;
  statusLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 180);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-12 z-20 border-b border-app-border bg-[oklch(0.99_0.003_75_/_0.94)] shadow-[0_8px_24px_rgba(35,32,28,0.08)] backdrop-blur-md [backdrop-filter:saturate(1.35)_blur(8px)]">
      <div className="mx-auto flex min-h-12 w-full max-w-[1280px] flex-nowrap items-center justify-between gap-3 px-4 py-2 sm:px-7">
        <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-app-foreground">
          <span>{scheduledLabel}</span>
          <span className="font-normal text-app-muted">
            {" "}
            · {automationName} · {statusLabel}
          </span>
        </div>
        <AutomationRunHeaderActions
          automationId={automationId}
          runId={runId}
          runStatus={runStatus}
        />
      </div>
    </div>
  );
}

function RecipientSendControl({
  decision,
  disabled,
  onChange,
}: {
  decision: string;
  disabled: boolean;
  onChange: (decision: ReviewDecision) => void;
}) {
  const normalizedDecision =
    decision === "PERMANENTLY_EXCLUDE" ? "SKIP_BATCH" : decision;
  const isSending = normalizedDecision === "SEND";
  const isPermanentlyExcluded = decision === "PERMANENTLY_EXCLUDE";

  return (
    <div className="flex w-full justify-center">
      <SendToggle
        disabled={disabled || isPermanentlyExcluded}
        isSending={isSending}
        onToggle={() => onChange(isSending ? "SKIP_BATCH" : "SEND")}
      />
    </div>
  );
}

function SendToggle({
  disabled,
  isSending,
  onToggle,
}: {
  disabled: boolean;
  isSending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-label={isSending ? "Don't send recipient" : "Send recipient"}
      aria-pressed={isSending}
      className={
        isSending
          ? "relative inline-flex h-6 w-10 cursor-pointer items-center rounded-full bg-app-accent p-0.5 transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-app-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
          : "relative inline-flex h-6 w-10 cursor-pointer items-center rounded-full border border-app-border bg-app-soft p-0.5 transition-colors duration-200 ease-out hover:bg-app-background focus:outline-none focus:ring-2 focus:ring-app-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
      }
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <span
        className={
          isSending
            ? "block size-5 translate-x-4 rounded-full bg-app-surface shadow-[0_1px_2px_rgba(35,32,28,0.22)] transition-transform duration-200 ease-out"
            : "block size-5 translate-x-0 rounded-full bg-app-surface shadow-[0_1px_2px_rgba(35,32,28,0.18)] transition-transform duration-200 ease-out"
        }
      />
    </button>
  );
}

function PermanentExcludeAction({
  disabled,
  isExcluded,
  onConfirm,
  recipientId,
}: {
  disabled: boolean;
  isExcluded: boolean;
  onConfirm: () => void;
  recipientId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionTooltip label={isExcluded ? "Excluded" : "Exclude"}>
        <button
          aria-label={isExcluded ? "Excluded" : "Exclude"}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-app-muted hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => setOpen(true)}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </ActionTooltip>

      {open ? (
        <div
          aria-labelledby={`permanent-exclude-title-${recipientId}`}
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/25 px-4"
          role="dialog"
        >
          <div className="grid w-full max-w-md gap-4 rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_18px_48px_rgba(35,32,28,0.2)]">
            <div className="grid gap-2">
              <h2
                className="text-[16px] font-semibold text-app-foreground"
                id={`permanent-exclude-title-${recipientId}`}
              >
                Exclude recipient?
              </h2>
              <p className="text-[13px] leading-6 text-app-muted">
                This person will not receive this workflow in this schedule or
                in future schedules. Canceling this scheduled run will not add
                them back.
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
              <button
                className="inline-flex min-h-9 cursor-pointer items-center rounded-[6px] bg-red-700 px-3 text-[12px] font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                type="button"
              >
                Exclude
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MobileRecipientAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-8 w-8 shrink-0 rounded-[6px] border border-app-border-strong bg-app-soft object-cover"
        src={photoUrl}
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-app-border-strong bg-app-soft font-mono text-[10px] font-semibold text-app-muted">
      {initialsForName(name)}
    </div>
  );
}

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}

type ReviewDecision = "SEND" | "SKIP_BATCH" | "PERMANENTLY_EXCLUDE";
