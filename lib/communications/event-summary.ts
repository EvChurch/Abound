import type { CommunicationAutomationRecord } from "@/lib/communications/automations";

type CommunicationEvent = {
  eventType: string;
  recipientId: string;
};

export const DELIVERY_EVENT_TYPES = [
  "SCHEDULED",
  "PROVIDER_ACCEPTED",
  "DELIVERED",
  "DELAYED",
  "FAILED",
  "BOUNCED",
  "COMPLAINED",
  "SUPPRESSED",
  "OPENED",
  "CLICKED",
] as const;

export const DELIVERY_EVENT_LABELS = {
  BOUNCED: "Bounced",
  CLICKED: "Clicked",
  COMPLAINED: "Complained",
  DELAYED: "Delayed",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  OPENED: "Opened",
  PROVIDER_ACCEPTED: "Sent",
  SCHEDULED: "Scheduled",
  SUPPRESSED: "Suppressed",
} satisfies Record<(typeof DELIVERY_EVENT_TYPES)[number], string>;

export type DeliveryEventType = (typeof DELIVERY_EVENT_TYPES)[number];

export function communicationRunEventCounts(events: CommunicationEvent[]) {
  const counts = Object.fromEntries(
    DELIVERY_EVENT_TYPES.map((eventType) => [eventType, 0]),
  ) as Record<DeliveryEventType, number>;

  for (const eventType of DELIVERY_EVENT_TYPES) {
    counts[eventType] = uniqueRecipientCount(events, eventType);
  }

  return counts;
}

export function communicationRunEventSummary(
  run: CommunicationAutomationRecord["runs"][number],
) {
  const counts = communicationRunEventCounts(run.events);
  const parts = DELIVERY_EVENT_TYPES.map((eventType) => {
    const count = counts[eventType];

    return count > 0
      ? `${count} ${DELIVERY_EVENT_LABELS[eventType].toLowerCase()}`
      : null;
  }).filter((part): part is string => Boolean(part));

  return parts.join(", ");
}

export function hasCommunicationRunEvents(
  run: CommunicationAutomationRecord["runs"][number],
) {
  return DELIVERY_EVENT_TYPES.some((eventType) =>
    run.events.some((event) => event.eventType === eventType),
  );
}

export function communicationRecipientEvents(
  run: CommunicationAutomationRecord["runs"][number],
  recipientId: string,
) {
  return run.events
    .filter((event) => event.recipientId === recipientId)
    .sort(
      (left, right) =>
        left.occurredAt.getTime() - right.occurredAt.getTime() ||
        left.id.localeCompare(right.id),
    );
}

function uniqueRecipientCount(
  events: CommunicationEvent[],
  eventType: DeliveryEventType,
) {
  return new Set(
    events
      .filter((event) => event.eventType === eventType)
      .map((event) => event.recipientId),
  ).size;
}
