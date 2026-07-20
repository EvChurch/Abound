import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  archiveCommunicationAutomationAction,
  deleteCommunicationAutomationAction,
  unarchiveCommunicationAutomationAction,
} from "@/app/communications/actions";
import { AutomationRowActions } from "@/components/communications/automation-row-actions";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import {
  listCommunicationAutomations,
  type CommunicationAutomationRecord,
} from "@/lib/communications/automations";
import { describeCommunicationCron } from "@/lib/communications/cron";

export async function CommunicationAutomationsWorkspace() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const automations = await listCommunicationAutomations(
    { limit: 25 },
    accessState.user,
  );

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
      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-5 sm:px-7 sm:py-7">
        <section className="grid gap-3">
          <p className="font-mono text-[11px] font-semibold uppercase text-app-accent-strong">
            Tools
          </p>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-2">
              <h1 className="text-[28px] font-semibold leading-[1.12] tracking-normal text-app-foreground sm:text-[42px]">
                Communications
              </h1>
              <p className="max-w-4xl text-[13px] leading-6 text-app-muted">
                Segment-based email workflows with frozen recipient lists,
                repeat rules, and Resend delivery.
              </p>
            </div>
            <Link
              className="inline-flex min-h-10 w-fit items-center gap-2 rounded-[6px] bg-app-accent px-3 text-[13px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              href="/communications/new"
            >
              <Plus aria-hidden="true" className="size-4" />
              Create workflow
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
          {automations.length === 0 ? (
            <div className="grid min-h-52 place-items-center px-6 py-10 text-center">
              <div className="grid max-w-xl gap-2">
                <h3 className="text-[18px] font-semibold text-app-foreground">
                  No workflows configured.
                </h3>
                <p className="text-[13px] leading-6 text-app-muted">
                  Create a saved People segment, then use it to configure an
                  email workflow with an editable template and reviewer gate.
                </p>
              </div>
            </div>
          ) : (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-[13px]">
                <thead className="text-[11px] uppercase text-app-muted">
                  <tr>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Latest run</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </tr>
                </thead>
                <tbody>
                  {automations.map((automation) => (
                    <AutomationRow
                      automation={automation}
                      key={automation.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {automations.length > 0 ? (
            <div className="grid divide-y divide-app-border md:hidden">
              {automations.map((automation) => (
                <AutomationCard automation={automation} key={automation.id} />
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function AutomationRow({
  automation,
}: {
  automation: CommunicationAutomationRecord;
}) {
  const latestRun = automation.runs[0];
  const segmentDetail = segmentSummaryDetail(automation);
  const scheduleDescription = scheduleText(automation.scheduleCron);
  const lifecycleMode = lifecycleModeForAutomation(automation);

  return (
    <tr className="group border-t border-app-border hover:bg-app-surface-subtle">
      <td className="px-4 py-3 align-middle">
        <Link
          className="font-semibold text-app-accent"
          href={`/communications/${automation.id}`}
        >
          {automation.name}
        </Link>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="grid gap-1">
          <span className="font-semibold text-app-foreground">
            {automation.savedListView.name}
          </span>
          {segmentDetail ? (
            <span className="text-[12px] text-app-muted">{segmentDetail}</span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-app-muted">
        {scheduleDescription}
      </td>
      <td className="px-4 py-3 align-middle">
        {latestRun ? (
          <div className="grid gap-1">
            <span className="font-semibold text-app-foreground">
              {formatStatus(latestRun.status)}
            </span>
            <span className="text-[12px] text-app-muted">
              {latestRun.deliverableCount} deliverable of{" "}
              {latestRun.recipientCount}
            </span>
          </div>
        ) : (
          <span className="text-[12px] text-app-muted">No runs yet</span>
        )}
      </td>
      <td className="w-12 px-3 py-3 align-middle">
        <AutomationRowActions
          action={actionForLifecycle(lifecycleMode)}
          automationId={automation.id}
          automationName={automation.name}
          mode={lifecycleMode}
        />
      </td>
    </tr>
  );
}

function AutomationCard({
  automation,
}: {
  automation: CommunicationAutomationRecord;
}) {
  const lifecycleMode = lifecycleModeForAutomation(automation);

  return (
    <article className="grid gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="block truncate font-semibold text-app-accent"
            href={`/communications/${automation.id}`}
          >
            {automation.name}
          </Link>
          <p className="mt-1 text-[12px] leading-5 text-app-muted">
            {automation.savedListView.name}
          </p>
        </div>
        <AutomationRowActions
          action={actionForLifecycle(lifecycleMode)}
          automationId={automation.id}
          automationName={automation.name}
          mode={lifecycleMode}
        />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <Metric
          label="Schedule"
          value={scheduleText(automation.scheduleCron)}
        />
        <Metric label="Runs" value={String(automation.runs.length)} />
      </dl>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-app-border bg-app-background px-3 py-2">
      <dt className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-app-foreground">{value}</dd>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-app-border px-4 py-3 font-semibold">
      {children}
    </th>
  );
}

function lifecycleModeForAutomation(automation: CommunicationAutomationRecord) {
  if (automation.archivedAt) {
    return "unarchive";
  }

  return automation.runs.length === 0 ? "delete" : "archive";
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

function segmentSummaryDetail(automation: CommunicationAutomationRecord) {
  const summary = automation.segmentSummary.trim();
  const savedViewSummary = `Saved view: ${automation.savedListView.name}`;

  if (!summary || summary === savedViewSummary) {
    return null;
  }

  return summary.replace(/^Saved view:\s*/i, "");
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
