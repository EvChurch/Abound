"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  RecipientEventIcon,
  recipientEventToneClass,
} from "./recipient-event-icons";

export type RecipientEventDisplayItem = {
  eventType: string;
  id: string;
  label: string;
  time: string;
};

export function RecipientEventDropdown({
  latestEvent,
  priorEvents,
}: {
  latestEvent: RecipientEventDisplayItem;
  priorEvents: RecipientEventDisplayItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPriorEvents = priorEvents.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className="relative w-full min-w-0 select-none px-4 text-[12px] md:px-0"
      onMouseDown={(event) => {
        if (event.detail > 1) {
          event.preventDefault();
        }
      }}
      ref={containerRef}
    >
      {!hasPriorEvents ? (
        <div className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-2.5 py-1.5 text-left text-app-muted">
          <EventIcon eventType={latestEvent.eventType} />
          <EventSummaryContent event={latestEvent} />
        </div>
      ) : null}
      {hasPriorEvents ? (
        <button
          aria-expanded={isOpen}
          className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-2.5 py-1.5 text-left text-app-muted transition-colors hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          <EventIcon eventType={latestEvent.eventType} />
          <EventSummaryContent event={latestEvent} />
          <ChevronDown
            aria-hidden="true"
            className={
              isOpen
                ? "size-3.5 shrink-0 rotate-180 transition-transform duration-150"
                : "size-3.5 shrink-0 transition-transform duration-150"
            }
          />
          <span className="sr-only">
            Show {priorEvents.length} prior{" "}
            {priorEvents.length === 1 ? "event" : "events"}
          </span>
        </button>
      ) : null}
      {hasPriorEvents ? (
        <div
          className={
            isOpen
              ? "absolute right-4 top-full z-30 mt-1 w-[calc(100%-2rem)] origin-top rounded-[6px] border border-app-border bg-app-background p-2 opacity-100 shadow-[0_8px_24px_rgba(35,32,28,0.10)] transition duration-150 ease-out md:right-0 md:w-full"
              : "pointer-events-none absolute right-4 top-full z-30 mt-1 w-[calc(100%-2rem)] origin-top -translate-y-1 scale-[0.98] rounded-[6px] border border-app-border bg-app-background p-2 opacity-0 shadow-[0_8px_24px_rgba(35,32,28,0.10)] transition duration-150 ease-out md:right-0 md:w-full"
          }
        >
          <ol className="grid list-none gap-1">
            {priorEvents.map((event) => (
              <li
                className="flex min-w-0 items-center gap-2 rounded-[4px] px-0.5 py-1"
                key={event.id}
              >
                <EventIcon eventType={event.eventType} />
                <EventSummaryContent event={event} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function EventSummaryContent({ event }: { event: RecipientEventDisplayItem }) {
  return (
    <span className="grid min-w-0 flex-1 gap-0.5 self-center py-1.5 leading-tight">
      <span className="truncate font-semibold text-app-foreground">
        {event.label}
      </span>
      <span className="truncate text-[11px] text-app-muted">{event.time}</span>
    </span>
  );
}

function EventIcon({ eventType }: { eventType: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${recipientEventToneClass(eventType)} flex size-5 shrink-0 items-center justify-center rounded-[4px]`}
    >
      <RecipientEventIcon className="size-3" eventType={eventType} />
    </span>
  );
}
