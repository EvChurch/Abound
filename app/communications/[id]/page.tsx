import Link from "next/link";
import { ChevronDown, ClipboardCheck, Play, Search } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import {
  archiveCommunicationAutomationAction,
  deleteCommunicationAutomationAction,
  runCommunicationAutomationNowAction,
  unarchiveCommunicationAutomationAction,
} from "@/app/communications/actions";
import { AutomationLifecycleAction } from "@/components/communications/automation-lifecycle-action";
import { ScheduledRunCancelAction } from "@/components/communications/scheduled-run-cancel-action";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { PageMessage } from "@/components/ui/page-message";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { APP_TIMEZONE } from "@/lib/app-timezone";
import {
  getCommunicationAutomation,
  getCommunicationAutomationLifecycleAction,
  type CommunicationAutomationRecord,
} from "@/lib/communications/automations";
import { describeCommunicationCron } from "@/lib/communications/cron";
import {
  communicationRunEventSummary,
  hasCommunicationRunEvents,
} from "@/lib/communications/event-summary";

type CommunicationAutomationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    review?: string;
    run?: string;
    runId?: string;
    send?: string;
  }>;
};

export async function generateMetadata({
  params,
}: CommunicationAutomationDetailPageProps) {
  const { id } = await params;

  return {
    title: `Communication ${id}`,
  };
}

export default async function CommunicationAutomationDetailPage({
  params,
  searchParams,
}: CommunicationAutomationDetailPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const [automation, lifecycleAction] = await Promise.all([
    getCommunicationAutomation(id, accessState.user),
    getCommunicationAutomationLifecycleAction(id, accessState.user),
  ]).catch((error: unknown) => {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  });

  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav
        active="communications"
        canManageSettings={hasPermission(
          accessState.user.role,
          "settings:manage",
        )}
        canManageTools={hasPermission(accessState.user.role, "pledges:manage")}
      />
      <CommunicationNotificationBanner
        automation={automation}
        reviewNotice={query.review}
        runId={query.runId}
        runNotice={query.run}
        sendNotice={query.send}
      />
      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-5 sm:px-7 sm:py-7">
        <section className="grid gap-3">
          <Link
            className="w-fit font-mono text-[11px] font-semibold uppercase text-app-accent-strong hover:text-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            href="/communications"
          >
            Communications
          </Link>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="grid gap-2">
              <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-app-foreground sm:text-[34px]">
                {automation.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex min-h-8 items-center rounded-[6px] border border-app-border bg-app-surface px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
                href={`/communications/${automation.id}/edit`}
              >
                Edit
              </Link>
              <AutomationLifecycleAction
                action={actionForLifecycle(lifecycleAction.action)}
                automationId={automation.id}
                mode={lifecycleAction.action}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4">
            <ScheduledRunsPanel automation={automation} />
          </div>

          <aside className="grid h-fit gap-4">
            <Panel title="Settings">
              <dl className="grid gap-2 text-[12px]">
                <Metric
                  label="Segment"
                  value={segmentText(automation.segmentSummary)}
                />
                <Metric
                  label="Schedule"
                  value={scheduleText(automation.scheduleCron)}
                />
                <Metric
                  label="Reviewers"
                  value={reviewerText(automation.reviewers)}
                />
                <Metric
                  label="Repeat sending"
                  value={formatRepeatSending(
                    automation.suppressionMode,
                    automation.cooldownDays,
                  )}
                />
              </dl>
            </Panel>
          </aside>
        </section>
      </main>
    </div>
  );
}

function ScheduledRunsPanel({
  automation,
}: {
  automation: CommunicationAutomationRecord;
}) {
  const activeRun = latestActiveRun(automation.runs);
  const visibleRuns = activeRun ? [activeRun] : [];
  const historicalRuns = automation.runs.filter(
    (run) => !visibleRuns.some((visibleRun) => visibleRun.id === run.id),
  );

  return (
    <Panel
      action={
        automation.archivedAt ? null : (
          <ScheduleRunAction
            automationId={automation.id}
            disabled={Boolean(activeRun)}
          />
        )
      }
      title="Scheduled runs"
    >
      {automation.runs.length === 0 ? (
        <div className="rounded-[6px] border border-app-border bg-app-background px-4 py-8 text-center text-[13px] text-app-muted">
          No scheduled runs yet.
        </div>
      ) : (
        <>
          {visibleRuns.length > 0 ? (
            <ScheduledRunsTable
              automationId={automation.id}
              runs={visibleRuns}
            />
          ) : (
            <div className="rounded-[6px] border border-app-border bg-app-background px-4 py-8 text-center text-[13px] text-app-muted">
              No active scheduled runs.
            </div>
          )}
          {historicalRuns.length > 0 ? (
            <details className="group rounded-[6px] border border-app-border bg-app-background">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-[12px] font-semibold text-app-muted hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30 [&::-webkit-details-marker]:hidden">
                <span>
                  More ({historicalRuns.length}{" "}
                  {historicalRuns.length === 1 ? "run" : "runs"})
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-open:rotate-180"
                />
              </summary>
              <ScheduledRunsTable
                automationId={automation.id}
                runs={historicalRuns}
              />
            </details>
          ) : null}
        </>
      )}
    </Panel>
  );
}

function latestActiveRun(runs: CommunicationAutomationRecord["runs"]) {
  return runs
    .filter(
      (run) =>
        run.status === "PENDING_NOTICE" ||
        run.status === "NOTICE_SENT" ||
        run.status === "READY_TO_SEND" ||
        run.status === "SENDING",
    )
    .sort(
      (left, right) =>
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        left.id.localeCompare(right.id),
    )[0];
}

function CommunicationNotificationBanner({
  automation,
  reviewNotice,
  runId,
  runNotice,
  sendNotice,
}: {
  automation: CommunicationAutomationRecord;
  reviewNotice?: string;
  runId?: string;
  runNotice?: string;
  sendNotice?: string;
}) {
  const run = automation.runs.find((scheduledRun) => scheduledRun.id === runId);
  const sendLabel = run ? formatDateTime(run.scheduledSendAt) : null;

  if (reviewNotice === "completed") {
    return (
      <PageMessage tone="info">
        Review completed. This scheduled run is ready to send
        {sendLabel ? ` on ${sendLabel}` : ""}.
      </PageMessage>
    );
  }

  if (sendNotice === "ready" || sendNotice === "running") {
    return (
      <PageMessage tone="info">
        This run is ready to send now. The worker will send it on its next
        check.
      </PageMessage>
    );
  }

  if (runNotice === "empty") {
    return (
      <PageMessage tone="warning">
        No run was created because there are no eligible recipients for this
        workflow right now.
      </PageMessage>
    );
  }

  return null;
}

function ScheduleRunAction({
  automationId,
  disabled,
}: {
  automationId: string;
  disabled: boolean;
}) {
  const descriptionId = `schedule-disabled-${automationId}`;

  return (
    <div className="group relative" tabIndex={disabled ? 0 : undefined}>
      <form action={runCommunicationAutomationNowAction}>
        <input name="id" type="hidden" value={automationId} />
        <button
          aria-describedby={disabled ? descriptionId : undefined}
          className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30 disabled:cursor-not-allowed disabled:border disabled:border-app-border disabled:bg-app-chip disabled:text-app-muted disabled:hover:bg-app-chip"
          disabled={disabled}
          type="submit"
        >
          <Play aria-hidden="true" className="size-3.5" />
          Schedule
        </button>
      </form>
      {disabled ? (
        <div
          className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-20 hidden w-64 rounded-[6px] border border-app-border bg-app-surface px-3 py-2 text-left text-[12px] font-medium leading-5 text-app-muted shadow-[0_12px_32px_rgba(35,32,28,0.16)] group-hover:block group-focus:block group-focus-within:block"
          id={descriptionId}
          role="tooltip"
        >
          There is already an active scheduled run. Finish or discard it before
          scheduling another run.
        </div>
      ) : null}
    </div>
  );
}

function ScheduledRunsTable({
  automationId,
  runs,
}: {
  automationId: string;
  runs: CommunicationAutomationRecord["runs"];
}) {
  return (
    <div>
      <div className="grid gap-2 md:hidden">
        {runs.map((run) => (
          <ScheduledRunCard
            automationId={automationId}
            key={run.id}
            run={run}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
          <ScheduledRunsColumnGroup />
          <thead className="text-[11px] uppercase text-app-muted">
            <tr>
              <TableHead>Scheduled</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead align="right">Status</TableHead>
              <TableHead align="right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr className="border-t border-app-border" key={run.id}>
                <td className="border-t border-app-border px-3 py-2 align-middle font-semibold leading-5 text-app-foreground">
                  {formatDateTime(run.scheduledSendAt)}
                </td>
                <td className="border-t border-app-border px-3 py-2 align-middle leading-5 text-app-muted">
                  <RecipientCounts run={run} />
                </td>
                <td className="border-t border-app-border px-3 py-2 text-right align-middle font-medium leading-5">
                  <StatusMarker run={run} />
                </td>
                <td className="border-t border-app-border px-3 py-2 align-middle">
                  <RunActions automationId={automationId} run={run} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduledRunsColumnGroup() {
  return (
    <colgroup>
      <col className="w-[32%]" />
      <col className="w-[24%]" />
      <col className="w-[28%]" />
      <col className="w-[16%]" />
    </colgroup>
  );
}

function ScheduledRunCard({
  automationId,
  run,
}: {
  automationId: string;
  run: CommunicationAutomationRecord["runs"][number];
}) {
  return (
    <article className="grid gap-3 border border-app-border bg-app-background px-3 py-3 text-[13px]">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold leading-5 text-app-foreground">
          {formatDateTime(run.scheduledSendAt)}
        </div>
        <div className="shrink-0 font-medium leading-5">
          <StatusMarker run={run} />
        </div>
      </div>
      <dl className="grid gap-3 text-[12px] leading-5">
        <div>
          <dt className="font-mono text-[10px] font-semibold uppercase text-app-muted">
            Recipients
          </dt>
          <dd className="mt-0.5 text-app-muted">
            <RecipientCounts run={run} />
          </dd>
        </div>
      </dl>
      <RunActions automationId={automationId} run={run} />
    </article>
  );
}

function RunActions({
  automationId,
  run,
}: {
  automationId: string;
  run: CommunicationAutomationRecord["runs"][number];
}) {
  if (
    run.status === "PENDING_NOTICE" ||
    run.status === "NOTICE_SENT" ||
    run.status === "READY_TO_SEND"
  ) {
    const reviewLabel =
      run.status === "READY_TO_SEND" ? "View run" : "Review recipients";
    const ReviewIcon = run.status === "READY_TO_SEND" ? Search : ClipboardCheck;

    return (
      <div className="flex flex-nowrap justify-end gap-1.5">
        <ActionTooltip label={reviewLabel}>
          <Link
            aria-label={reviewLabel}
            className="inline-flex size-8 items-center justify-center rounded-[6px] border border-app-border bg-app-background text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            href={reviewRunHref(automationId, run.id)}
          >
            <ReviewIcon aria-hidden="true" className="size-4" />
          </Link>
        </ActionTooltip>
        <ScheduledRunCancelAction automationId={automationId} runId={run.id} />
      </div>
    );
  }

  if (
    run.status === "SENT" ||
    run.status === "PARTIAL" ||
    run.status === "FAILED"
  ) {
    return (
      <div className="flex flex-nowrap justify-end gap-1.5">
        <ActionTooltip label="View recipients">
          <Link
            aria-label="View recipients"
            className="inline-flex size-8 items-center justify-center rounded-[6px] border border-app-border bg-app-background text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            href={reviewRunHref(automationId, run.id)}
          >
            <Search aria-hidden="true" className="size-4" />
          </Link>
        </ActionTooltip>
      </div>
    );
  }

  return null;
}

function reviewRunHref(automationId: string, runId: string) {
  return `/communications/${automationId}/runs/${runId}`;
}

function RecipientCounts({
  run,
}: {
  run: CommunicationAutomationRecord["runs"][number];
}) {
  if (run.excludedCount === 0) {
    return <>{run.deliverableCount} ready</>;
  }

  return (
    <>
      {run.deliverableCount} ready, {run.excludedCount} excluded
    </>
  );
}

function Panel({
  action,
  children,
  subtitle,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-app-border bg-app-soft px-4 py-3">
        <div>
          <h2 className="text-[14px] font-semibold text-app-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[12px] text-app-muted">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="grid gap-3 p-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-app-border bg-app-background px-3 py-2">
      <dt className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-app-foreground">
        {value}
      </dd>
    </div>
  );
}

function StatusMarker({
  run,
}: {
  run: CommunicationAutomationRecord["runs"][number];
}) {
  const tone = getStatusTone(run.status);

  return (
    <span
      className={`relative inline-flex h-5 items-center pl-3 text-[12px] leading-5 ${tone.text}`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full ${tone.dot}`}
      />
      {formatRunStatus(run)}
    </span>
  );
}

function formatRunStatus(run: CommunicationAutomationRecord["runs"][number]) {
  const status = formatStatus(run.status);

  if (!hasCommunicationRunEvents(run)) {
    return status;
  }

  const eventSummary = communicationRunEventSummary(run);

  return eventSummary ? `${status}, ${eventSummary}` : status;
}

function getStatusTone(status: string) {
  if (status === "SENT" || status === "DELIVERED") {
    return { dot: "bg-emerald-600", text: "text-emerald-950" };
  }

  if (status === "PENDING_NOTICE" || status === "NOTICE_SENT") {
    return { dot: "bg-amber-600", text: "text-amber-950" };
  }

  if (status === "CANCELED" || status === "SKIPPED") {
    return { dot: "bg-app-muted", text: "text-app-muted" };
  }

  if (status === "FAILED" || status === "PARTIAL") {
    return { dot: "bg-rose-600", text: "text-rose-950" };
  }

  return { dot: "bg-sky-600", text: "text-sky-950" };
}

function TableHead({
  align = "left",
  children,
}: {
  align?: "left" | "right";
  children: string;
}) {
  return (
    <th
      className={`border-b border-app-border px-3 py-2 font-semibold ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    CANCELED: "Discarded",
    NOTICE_SENT: "Awaiting review",
    PENDING_NOTICE: "Ready for review",
  };

  if (labels[status]) {
    return labels[status];
  }

  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIMEZONE,
  }).format(value);
}

function segmentText(segmentSummary: string) {
  return segmentSummary.replace(/^Saved view:\s*/i, "");
}

function reviewerText(reviewers: CommunicationAutomationRecord["reviewers"]) {
  if (reviewers.length === 0) {
    return "No reviewers";
  }

  return reviewers
    .map(
      (reviewer) =>
        reviewer.reviewer.name ?? reviewer.reviewer.email ?? "Unknown reviewer",
    )
    .join(", ");
}

function scheduleText(scheduleCron: string) {
  const result = describeCommunicationCron(scheduleCron);

  if (!result.isValid) {
    return scheduleCron;
  }

  return result.description
    .replace(/\s+New Zealand time\.$/, ".")
    .replace(/^Runs every\s+/i, "")
    .replace(/^Runs daily\s+/i, "Daily ")
    .replace(/^Runs monthly\s+/i, "Monthly ")
    .replace(/\.$/, "");
}

function formatRepeatSending(
  mode: CommunicationAutomationRecord["suppressionMode"],
  cooldownDays: number | null,
) {
  if (mode === "EVERY_RUN") {
    return "Send on every scheduled run";
  }

  if (mode === "COOLDOWN") {
    return `Send again after ${cooldownDays ?? 0} days`;
  }

  return "Send once per person";
}

function isNotFoundError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "extensions" in error &&
    (error as { extensions?: { code?: string } }).extensions?.code ===
      "NOT_FOUND"
  );
}

function actionForLifecycle(action: "archive" | "delete" | "unarchive") {
  if (action === "delete") {
    return deleteCommunicationAutomationAction;
  }

  if (action === "unarchive") {
    return unarchiveCommunicationAutomationAction;
  }

  return archiveCommunicationAutomationAction;
}
