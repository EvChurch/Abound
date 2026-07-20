"use client";

import Link from "next/link";

import { useRef } from "react";
import { Archive, Filter } from "lucide-react";

import {
  archivePeopleSegmentAction,
  savePeopleSegmentAction,
} from "@/app/people/actions";
import { DropdownPanel } from "@/components/ui/dropdown-panel";
import type { ListColumnKey } from "@/lib/list-views/columns";
import type { AppliedListView } from "@/lib/list-views/people-list";
import type { SavedListViewRecord } from "@/lib/list-views/saved-views";
import type {
  ListViewShellFilters,
  PageParamValue,
  PeopleSortParam,
} from "@/lib/list-views/page-params";

type SaveSegmentDialogProps = {
  ageGroup?: string | null;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  selectedColumns: ListColumnKey[];
  sort?: PeopleSortParam | null;
  triggerClassName?: string;
  triggerLabel?: string;
};

type ChooseSegmentDialogProps = {
  activeSegmentId?: string | null;
  segments: SavedListViewRecord[];
};

type SegmentMenuProps = {
  ageGroup?: string | null;
  appliedView: AppliedListView;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  canSaveCurrent: boolean;
  selectedColumns: ListColumnKey[];
  segments: SavedListViewRecord[];
  sort?: PeopleSortParam | null;
  triggerVariant?: "button" | "filterIcon";
};

export function SegmentMenu({
  ageGroup,
  appliedView,
  filters,
  lifecycle,
  query,
  canSaveCurrent,
  selectedColumns,
  segments,
  sort,
  triggerVariant = "button",
}: SegmentMenuProps) {
  const compactTrigger = triggerVariant === "filterIcon";

  return (
    <DropdownPanel
      align="right"
      panelClassName="grid gap-1 rounded-[8px] border border-app-border bg-app-surface p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
      portal
      side="bottom"
      trigger={
        compactTrigger ? (
          <>
            <span className="sr-only">Segments</span>
            <Filter aria-hidden="true" className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            <span>Segments</span>
            <span
              aria-hidden="true"
              className="max-w-32 truncate rounded-full bg-app-chip px-2 py-0.5 text-[11px] font-semibold text-app-muted"
            >
              {appliedView.name}
            </span>
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5 text-app-muted"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </>
        )
      }
      triggerClassName={
        compactTrigger
          ? "inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-app-border bg-app-surface text-app-muted outline-none transition hover:border-app-accent hover:bg-app-chip hover:text-app-foreground focus-visible:ring-2 focus-visible:ring-app-accent/25"
          : "inline-flex h-9 items-center gap-2 rounded-[6px] border border-app-border bg-app-surface px-2.5 text-[12.5px] font-semibold text-app-foreground outline-none transition hover:border-app-accent hover:bg-app-chip focus-visible:ring-2 focus-visible:ring-app-accent/25"
      }
      widthClassName="w-72"
    >
      <div className="grid gap-1">
        {canSaveCurrent ? (
          <>
            <SaveSegmentDialog
              ageGroup={ageGroup}
              filters={filters}
              lifecycle={lifecycle}
              query={query}
              selectedColumns={selectedColumns}
              sort={sort}
              triggerClassName="flex min-h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[12.5px] font-semibold text-app-muted hover:bg-app-soft hover:text-app-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
              triggerLabel="Save Current Filter as Segment"
            />
            <div className="my-1 border-t border-app-border" />
          </>
        ) : null}
        <SegmentList
          ageGroup={ageGroup}
          appliedView={appliedView}
          filters={filters}
          lifecycle={lifecycle}
          query={query}
          selectedColumns={selectedColumns}
          segments={segments}
          sort={sort}
        />
      </div>
    </DropdownPanel>
  );
}

function SegmentList({
  ageGroup,
  appliedView,
  filters,
  lifecycle,
  query,
  selectedColumns,
  segments,
  sort,
}: {
  ageGroup?: string | null;
  appliedView: AppliedListView;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  selectedColumns: ListColumnKey[];
  segments: SavedListViewRecord[];
  sort?: PeopleSortParam | null;
}) {
  const returnTo = segmentReturnPath({
    ageGroup,
    filters,
    lifecycle,
    query,
    selectedColumns,
    sort,
  });

  return (
    <div className="max-h-60 overflow-y-auto">
      {segments.length > 0 ? (
        <div className="grid gap-1">
          {segments.map((segment) => (
            <SegmentMenuItem
              active={segment.id === appliedView.id}
              href={`/people?savedViewId=${segment.id}`}
              key={segment.id}
              returnTo={returnTo}
              segment={segment}
            >
              {segment.name}
            </SegmentMenuItem>
          ))}
        </div>
      ) : (
        <p className="px-2.5 py-2 text-[12px] font-medium text-app-muted">
          No saved segments yet.
        </p>
      )}
    </div>
  );
}

export function ChooseSegmentDialog({
  activeSegmentId,
  segments,
}: ChooseSegmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className="inline-flex min-h-9 w-full items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
        onClick={() => openDialog(dialogRef.current)}
        type="button"
      >
        Choose segment
      </button>
      <dialog
        className="m-auto max-h-[calc(100vh-32px)] w-[min(420px,calc(100vw-32px))] rounded-[8px] border border-app-border bg-app-surface p-0 text-app-foreground shadow-[0_18px_60px_rgba(20,18,14,0.28)] backdrop:bg-black/30"
        ref={dialogRef}
      >
        <form action="/people" className="grid gap-4 p-4">
          <div className="grid gap-1">
            <h2 className="text-[16px] font-semibold text-app-foreground">
              Choose segment
            </h2>
            <p className="text-[13px] leading-6 text-app-muted">
              Load a saved People segment and its filters.
            </p>
          </div>
          <label className="grid gap-1">
            <span className="text-[12px] font-semibold text-app-muted">
              Segment
            </span>
            <select
              className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
              defaultValue={activeSegmentId ?? ""}
              name="savedViewId"
            >
              <option value="">All people</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground"
              onClick={() => closeDialog(dialogRef.current)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              type="submit"
            >
              Load
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function SaveSegmentDialog({
  ageGroup,
  filters,
  lifecycle,
  query,
  selectedColumns,
  sort,
  triggerClassName,
  triggerLabel = "Save segment",
}: SaveSegmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        className={
          triggerClassName ??
          "inline-flex min-h-9 w-full items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
        }
        onClick={() => openDialog(dialogRef.current)}
        type="button"
      >
        {triggerLabel}
      </button>
      <dialog
        className="m-auto max-h-[calc(100vh-32px)] w-[min(420px,calc(100vw-32px))] rounded-[8px] border border-app-border bg-app-surface p-0 text-app-foreground shadow-[0_18px_60px_rgba(20,18,14,0.28)] backdrop:bg-black/30"
        ref={dialogRef}
      >
        <form action={savePeopleSegmentAction} className="grid gap-4 p-4">
          <PreservedSegmentInputs
            ageGroup={ageGroup}
            filters={filters}
            lifecycle={lifecycle}
            query={query}
            selectedColumns={selectedColumns}
            sort={sort}
          />
          <div className="grid gap-1">
            <h2 className="text-[16px] font-semibold text-app-foreground">
              Save segment
            </h2>
            <p className="text-[13px] leading-6 text-app-muted">
              Name this filtered People audience so it can be recalled later.
            </p>
          </div>
          <label className="grid gap-1">
            <span className="text-[12px] font-semibold text-app-muted">
              Segment name
            </span>
            <input
              autoFocus
              className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
              name="name"
              placeholder="New people this month"
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground"
              onClick={() => closeDialog(dialogRef.current)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function SegmentMenuItem({
  active,
  children,
  href,
  returnTo,
  segment,
}: {
  active: boolean;
  children: string;
  href: string;
  returnTo: string;
  segment: SavedListViewRecord;
}) {
  return (
    <div
      className={
        active
          ? "group grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center rounded-[6px] bg-app-chip"
          : "group grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center rounded-[6px] hover:bg-app-soft"
      }
    >
      <Link
        aria-current={active ? "page" : undefined}
        className={
          active
            ? "flex min-h-8 items-center rounded-l-[6px] px-2.5 text-[12.5px] font-semibold text-app-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
            : "flex min-h-8 items-center rounded-l-[6px] px-2.5 text-[12.5px] font-semibold text-app-muted hover:text-app-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
        }
        href={href}
      >
        <span className="truncate">{children}</span>
      </Link>
      <ArchiveSegmentDialog returnTo={returnTo} segment={segment} />
    </div>
  );
}

function ArchiveSegmentDialog({
  returnTo,
  segment,
}: {
  returnTo: string;
  segment: SavedListViewRecord;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        aria-label={`Archive ${segment.name}`}
        className="mr-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-app-muted opacity-0 outline-none transition group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-app-surface hover:text-app-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-app-accent/25"
        onClick={(event) => {
          event.stopPropagation();
          openDialog(dialogRef.current);
        }}
        title={`Archive ${segment.name}`}
        type="button"
      >
        <Archive aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <dialog
        className="m-auto max-h-[calc(100vh-32px)] w-[min(420px,calc(100vw-32px))] rounded-[8px] border border-app-border bg-app-surface p-0 text-app-foreground shadow-[0_18px_60px_rgba(20,18,14,0.28)] backdrop:bg-black/30"
        ref={dialogRef}
      >
        <form action={archivePeopleSegmentAction} className="grid gap-4 p-4">
          <input name="segmentId" type="hidden" value={segment.id} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <div className="grid gap-1">
            <h2 className="text-[16px] font-semibold text-app-foreground">
              Archive segment
            </h2>
            <p className="text-[13px] leading-6 text-app-muted">
              Archiving hides {segment.name} from this segment menu. Existing
              communications and automations that already use it will continue
              to use the saved audience definition.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground"
              onClick={() => closeDialog(dialogRef.current)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              type="submit"
            >
              Archive
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function openDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog: HTMLDialogElement | null) {
  if (dialog && typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog?.removeAttribute("open");
  }
}

function PreservedSegmentInputs({
  ageGroup,
  filters,
  lifecycle,
  query,
  selectedColumns,
  sort,
}: SaveSegmentDialogProps) {
  const entries: Array<[string, string]> = [];

  if (sort && !(sort.field === "firstName" && sort.direction === "asc")) {
    entries.push([
      "sort",
      sort.direction === "desc" ? `${sort.field}:desc` : sort.field,
    ]);
  }
  if (query) entries.push(["q", query]);
  entries.push(["columns", selectedColumns.join(",")]);
  for (const value of filterValues(lifecycle))
    entries.push(["lifecycle", value]);
  if (ageGroup) entries.push(["ageGroup", ageGroup]);

  for (const [key, value] of Object.entries(listFilterQuery(filters))) {
    if (Array.isArray(value)) {
      for (const item of value) entries.push([key, item]);
    } else {
      entries.push([key, value]);
    }
  }

  return (
    <>
      {entries.map(([name, value], index) => (
        <input
          key={`${name}:${index}`}
          name={name}
          type="hidden"
          value={value}
        />
      ))}
    </>
  );
}

function segmentReturnPath({
  ageGroup,
  filters,
  lifecycle,
  query,
  selectedColumns,
  sort,
}: {
  ageGroup?: string | null;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  selectedColumns: ListColumnKey[];
  sort?: PeopleSortParam | null;
}) {
  const params = new URLSearchParams();

  if (sort && !(sort.field === "firstName" && sort.direction === "asc")) {
    params.set(
      "sort",
      sort.direction === "desc" ? `${sort.field}:desc` : sort.field,
    );
  }
  if (query) params.set("q", query);
  for (const value of filterValues(lifecycle)) {
    params.append("lifecycle", value);
  }
  if (ageGroup) params.set("ageGroup", ageGroup);
  for (const [key, value] of Object.entries(listFilterQuery(filters))) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  if (selectedColumns.length > 0) {
    params.set("columns", selectedColumns.join(","));
  }

  const queryString = params.toString();

  return queryString ? `/people?${queryString}` : "/people";
}

function listFilterQuery(filters?: ListViewShellFilters) {
  return {
    ...(filters?.active ? { active: filters.active } : {}),
    ...(filters?.archived ? { archived: filters.archived } : {}),
    ...(filters?.campus ? { campus: filters.campus } : {}),
    ...(filters?.connectGroup ? { connectGroup: filters.connectGroup } : {}),
    ...(filters?.emailCapable ? { emailCapable: filters.emailCapable } : {}),
    ...(filters?.emailStatus ? { emailStatus: filters.emailStatus } : {}),
    ...(filters?.householdGivingState
      ? { householdGivingState: filters.householdGivingState }
      : {}),
    ...(filterValues(filters?.pledgeState).length > 0
      ? { pledgeState: filterValues(filters?.pledgeState) }
      : {}),
    ...(filterValues(filters?.connectionStatus).length > 0
      ? { connectionStatus: filterValues(filters?.connectionStatus) }
      : {}),
    ...(filterValues(filters?.recordStatus).length > 0
      ? { recordStatus: filterValues(filters?.recordStatus) }
      : {}),
    ...(filters?.rockStatus ? { rockStatus: filters.rockStatus } : {}),
    ...(filters?.taskPriority ? { taskPriority: filters.taskPriority } : {}),
    ...(filters?.taskStatus ? { taskStatus: filters.taskStatus } : {}),
  };
}

function filterValues(value?: string | string[] | null) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values.map((item) => item.trim()).filter(Boolean);
}
