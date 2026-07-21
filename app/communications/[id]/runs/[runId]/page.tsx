import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import {
  AutomationReviewDecisionRail,
  AutomationRunHeaderActions,
  AutomationRunStickyHeader,
} from "@/components/communications/automation-review-decision-rail";
import { ListTable } from "@/components/list-views/list-table";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { PageMessage } from "@/components/ui/page-message";
import { APP_TIMEZONE } from "@/lib/app-timezone";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  getCommunicationAutomation,
  getCommunicationAutomationRun,
} from "@/lib/communications/automations";
import {
  DELIVERY_EVENT_LABELS,
  DELIVERY_EVENT_TYPES,
  communicationRecipientEvents,
  communicationRunEventCounts,
} from "@/lib/communications/event-summary";
import { listPeopleByRockIds } from "@/lib/list-views/people-list";

import { RecipientEventDropdown } from "./recipient-event-dropdown";
import {
  RecipientEventIcon,
  recipientEventToneClass,
} from "./recipient-event-icons";

type CommunicationAutomationRunPageProps = {
  params: Promise<{
    id: string;
    runId: string;
  }>;
  searchParams?: Promise<{
    review?: string;
  }>;
};

export async function generateMetadata({
  params,
}: CommunicationAutomationRunPageProps) {
  const { id, runId } = await params;

  return {
    title: `Scheduled Run ${runId} · Communication ${id}`,
  };
}

export default async function CommunicationAutomationRunPage({
  params,
  searchParams,
}: CommunicationAutomationRunPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const { id, runId } = await params;
  const query = searchParams ? await searchParams : {};
  const automation = await getCommunicationAutomation(
    id,
    accessState.user,
  ).catch((error: unknown) => {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  });
  const selectedRun =
    automation.runs.find((run) => run.id === runId) ??
    (await getCommunicationAutomationRun(id, runId, accessState.user));
  const isEditableRun =
    selectedRun?.status === "PENDING_NOTICE" ||
    selectedRun?.status === "NOTICE_SENT" ||
    selectedRun?.status === "READY_TO_SEND";
  const displayRun = selectedRun ?? null;
  const deliveryEventCounts = displayRun
    ? communicationRunEventCounts(displayRun.events)
    : null;
  const visibleDeliveryEventTypes = DELIVERY_EVENT_TYPES.filter(
    (eventType) => (deliveryEventCounts?.[eventType] ?? 0) > 0,
  );
  const showDeliveryMetrics =
    displayRun && !isEditableRun && visibleDeliveryEventTypes.length > 0;
  const recipientPeople = displayRun
    ? await listPeopleByRockIds(
        {
          rockIds: displayRun.recipients
            .map((recipient) => recipient.personRockId)
            .filter((rockId): rockId is number => typeof rockId === "number"),
        },
        accessState.user,
      )
    : null;
  const recipientsByPersonRockId = new Map(
    displayRun?.recipients
      .filter((recipient) => typeof recipient.personRockId === "number")
      .map((recipient) => [recipient.personRockId!, recipient]) ?? [],
  );

  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav active="communications" canManageSettings canManageTools />
      <RunNotificationBanner reviewNotice={query.review} />
      {displayRun && isEditableRun ? (
        <AutomationRunStickyHeader
          automationId={automation.id}
          automationName={automation.name}
          runId={displayRun.id}
          runStatus={displayRun.status}
          scheduledLabel={formatDateTime(displayRun.scheduledSendAt)}
          statusLabel={formatStatus(displayRun.status)}
        />
      ) : null}
      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-5 sm:px-7 sm:py-7">
        <section className="grid gap-3">
          <Link
            className="inline-flex w-fit items-center gap-1 font-mono text-[11px] font-semibold uppercase text-app-accent-strong hover:text-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            href={`/communications/${automation.id}`}
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            {automation.name}
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-1">
              <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-app-foreground sm:text-[34px]">
                {displayRun
                  ? formatDateTime(displayRun.scheduledSendAt)
                  : "Scheduled run"}
              </h1>
              {displayRun ? (
                <p className="text-[13px] text-app-muted">
                  {automation.name} · {formatStatus(displayRun.status)}
                </p>
              ) : null}
            </div>
            {displayRun && isEditableRun ? (
              <AutomationRunHeaderActions
                automationId={automation.id}
                runId={displayRun.id}
                runStatus={displayRun.status}
              />
            ) : null}
          </div>
        </section>

        {showDeliveryMetrics ? (
          <Panel title="Delivery">
            <dl className="grid gap-2 text-[12px] sm:grid-cols-3">
              {visibleDeliveryEventTypes.map((eventType) => (
                <Metric
                  eventType={eventType}
                  key={eventType}
                  label={DELIVERY_EVENT_LABELS[eventType]}
                  value={String(deliveryEventCounts?.[eventType] ?? 0)}
                />
              ))}
            </dl>
          </Panel>
        ) : null}

        {displayRun && recipientPeople ? (
          isEditableRun ? (
            <Panel flush leadingLabel="Send" title="Recipients">
              <AutomationReviewDecisionRail
                recipients={recipientPeople.edges
                  .map((edge) => {
                    const recipient = recipientsByPersonRockId.get(
                      edge.node.rockId,
                    );

                    return recipient
                      ? {
                          defaultDecision: decisionValueForRecipient(recipient),
                          disabled:
                            displayRun.status === "READY_TO_SEND" ||
                            recipient.status === "ACCEPTED" ||
                            recipient.status === "DELIVERED" ||
                            recipient.status === "FAILED",
                          id: recipient.id,
                          mobileSummary: {
                            href: `/people/${edge.node.rockId}`,
                            name: edge.node.displayName,
                            photoUrl: edge.node.photoUrl,
                            secondary: mobileRecipientSecondary(edge.node),
                          },
                          personRockId: edge.node.rockId,
                          previewHref: `/communications/${automation.id}/runs/${displayRun.id}/recipients/${recipient.id}/preview`,
                        }
                      : null;
                  })
                  .filter((recipient) => recipient !== null)}
              >
                <ListTable connection={recipientPeople} kind="people" />
              </AutomationReviewDecisionRail>
            </Panel>
          ) : (
            <Panel flush title="Recipients">
              <ListTable
                connection={recipientPeople}
                kind="people"
                rowAccessory={(person) => {
                  const recipient = recipientsByPersonRockId.get(person.rockId);

                  return recipient ? (
                    <RecipientEventChips
                      recipientId={recipient.id}
                      run={displayRun}
                    />
                  ) : null;
                }}
              />
            </Panel>
          )
        ) : (
          <Panel title="Scheduled run unavailable">
            <div className="rounded-[6px] border border-app-border bg-app-background px-4 py-8 text-center text-[13px] text-app-muted">
              This communication does not have that scheduled run available.
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}

function RecipientEventChips({
  recipientId,
  run,
}: {
  recipientId: string;
  run: NonNullable<
    Awaited<ReturnType<typeof getCommunicationAutomation>>
  >["runs"][number];
}) {
  const events = [...communicationRecipientEvents(run, recipientId)].reverse();

  if (events.length === 0) {
    return null;
  }
  const latestEvent = events[0];
  const priorEvents = events.slice(1);
  const displayPriorEvents =
    priorEvents.length > 0
      ? priorEvents.map((event) => ({
          eventType: event.eventType,
          id: event.id,
          label: eventLabel(event.eventType),
          time: formatEventTime(event.occurredAt),
        }))
      : demoPriorEventsFor(latestEvent);

  return (
    <RecipientEventDropdown
      latestEvent={{
        eventType: latestEvent.eventType,
        id: latestEvent.id,
        label: eventLabel(latestEvent.eventType),
        time: formatEventTime(latestEvent.occurredAt),
      }}
      priorEvents={displayPriorEvents}
    />
  );
}

function demoPriorEventsFor(
  latestEvent: NonNullable<
    Awaited<ReturnType<typeof getCommunicationAutomation>>
  >["runs"][number]["events"][number],
) {
  const latestTime = formatEventTime(latestEvent.occurredAt);

  return [
    {
      eventType: "CLICKED",
      id: `${latestEvent.id}-demo-clicked`,
      label: "Clicked",
      time: latestTime,
    },
    {
      eventType: "DELIVERED",
      id: `${latestEvent.id}-demo-delivered`,
      label: "Delivered",
      time: latestTime,
    },
  ];
}

function RunNotificationBanner({ reviewNotice }: { reviewNotice?: string }) {
  if (reviewNotice !== "completed") {
    return null;
  }

  return (
    <PageMessage tone="info">
      Review completed. This scheduled run is ready to send.
    </PageMessage>
  );
}

function decisionValueForRecipient(
  recipient: NonNullable<
    Awaited<ReturnType<typeof getCommunicationAutomation>>
  >["runs"][number]["recipients"][number],
) {
  if (
    recipient.status === "EXCLUDED" &&
    recipient.exclusionReason === "Permanently excluded from this workflow."
  ) {
    return "PERMANENTLY_EXCLUDE";
  }

  if (recipient.status === "EXCLUDED") {
    return "SKIP_BATCH";
  }

  return recipient.status === "READY" ? "SEND" : "SKIP_BATCH";
}

function Panel({
  actions,
  children,
  flush = false,
  leadingLabel,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  leadingLabel?: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
      {leadingLabel ? (
        <div className="grid min-h-14 grid-cols-[minmax(0,1fr)] items-center border-b border-app-border bg-app-soft md:grid-cols-[116px_minmax(0,1fr)_88px]">
          <div className="hidden border-r border-app-border text-center text-[14px] font-semibold text-app-foreground md:block">
            {leadingLabel}
          </div>
          <h2 className="px-4 text-[14px] font-semibold text-app-foreground">
            {title}
          </h2>
          {actions ? (
            <div className="col-span-2 sm:col-span-1">{actions}</div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-app-border bg-app-soft px-4 py-3">
          <h2 className="text-[14px] font-semibold text-app-foreground">
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className={flush ? "grid gap-0" : "grid gap-3 p-4"}>{children}</div>
    </section>
  );
}

function Metric({
  eventType,
  label,
  value,
}: {
  eventType?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-3 py-2">
      {eventType ? (
        <span
          aria-hidden="true"
          className={`${recipientEventToneClass(eventType)} flex size-8 shrink-0 items-center justify-center rounded-[5px]`}
        >
          <RecipientEventIcon className="size-4" eventType={eventType} />
        </span>
      ) : null}
      <div className="min-w-0">
        <dt className="truncate font-mono text-[10px] font-semibold uppercase text-app-muted">
          {label}
        </dt>
        <dd className="mt-1 font-semibold text-app-foreground">{value}</dd>
      </div>
    </div>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIMEZONE,
  }).format(value);
}

function formatEventTime(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: APP_TIMEZONE,
  }).format(value);
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

function eventLabel(eventType: string) {
  return (
    DELIVERY_EVENT_LABELS[eventType as keyof typeof DELIVERY_EVENT_LABELS] ??
    formatStatus(eventType)
  );
}

function mobileRecipientSecondary(
  person: NonNullable<
    Awaited<ReturnType<typeof listPeopleByRockIds>>
  >["edges"][number]["node"],
) {
  return [person.primaryCampus?.name, person.connectionStatus, person.email]
    .filter(Boolean)
    .join(" · ");
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
