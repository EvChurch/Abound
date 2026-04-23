import { CircleCheck, FilePenLine, SearchCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type {
  HouseholdListRow,
  HouseholdsConnection,
} from "@/lib/list-views/households-list";
import type {
  PeopleConnection,
  PledgeListItem,
  PersonListRow,
} from "@/lib/list-views/people-list";
import {
  defaultListColumns,
  type ListColumnKey,
} from "@/lib/list-views/columns";

type ListTableProps =
  | {
      columns?: ListColumnKey[];
      connection: PeopleConnection;
      kind: "people";
    }
  | {
      columns?: ListColumnKey[];
      connection: HouseholdsConnection;
      kind: "households";
    };

export function ListTable({ columns, connection, kind }: ListTableProps) {
  const visibleColumns = normalizeColumns(columns);

  return (
    <div
      className="bg-app-surface"
      role={connection.edges.length > 0 ? "list" : undefined}
    >
      {connection.edges.length === 0 ? (
        <div
          className="mx-3 my-3 rounded-[7px] border border-dashed border-app-border bg-app-background px-4 py-8 text-center text-[13px] font-medium text-app-muted"
          role="status"
        >
          No records match this view.
        </div>
      ) : null}
      {connection.edges.map((edge) =>
        kind === "people" ? (
          <PeopleRow
            columns={visibleColumns}
            key={edge.cursor}
            row={edge.node as PersonListRow}
          />
        ) : (
          <HouseholdRow
            columns={visibleColumns}
            key={edge.cursor}
            row={edge.node as HouseholdListRow}
          />
        ),
      )}
    </div>
  );
}

function PeopleRow({
  columns,
  row,
}: {
  columns: ListColumnKey[];
  row: PersonListRow;
}) {
  const showPledgeColumn = columns.includes("pledges");

  return (
    <article
      className="border-b border-app-border bg-app-surface px-4 py-2.5 text-[13px] transition-colors hover:bg-app-surface-subtle"
      role="listitem"
    >
      <div
        className={
          showPledgeColumn
            ? "grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] md:items-start"
            : "min-w-0"
        }
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <PersonAvatar row={row} />
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <Link
                className="font-semibold leading-tight text-app-accent"
                href={`/people/${row.rockId}`}
              >
                {row.displayName}
              </Link>
              <div className="truncate text-[12px] leading-tight text-app-muted">
                {personSecondaryText(row, columns.includes("campus"))}
              </div>
            </div>
            <PersonDisplayFields columns={columns} row={row} />
          </div>
        </div>
        {showPledgeColumn ? (
          <PledgeColumn
            amountsHidden={row.amountsHidden}
            summary={row.pledgeSummary}
          />
        ) : null}
      </div>
    </article>
  );
}

function HouseholdRow({
  columns,
  row,
}: {
  columns: ListColumnKey[];
  row: HouseholdListRow;
}) {
  return (
    <article
      className="border-b border-app-border bg-app-surface px-4 py-2.5 text-[13px] transition-colors hover:bg-app-surface-subtle"
      role="listitem"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <HouseholdAvatar members={row.primaryContacts} name={row.name} />
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <Link
              className="font-semibold leading-tight text-app-accent"
              href={`/households/${row.rockId}`}
            >
              {row.name}
            </Link>
            <div className="truncate text-[12px] leading-tight text-app-muted">
              {householdSecondaryText(row, columns.includes("campus"))}
            </div>
          </div>
          <HouseholdDisplayFields columns={columns} row={row} />
        </div>
      </div>
    </article>
  );
}

function PersonDisplayFields({
  columns,
  row,
}: {
  columns: ListColumnKey[];
  row: PersonListRow;
}) {
  return (
    <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] leading-tight">
      {columns.includes("lifecycle") && row.lifecycle.length > 0 ? (
        <LifecycleField labels={row.lifecycle} />
      ) : null}
      {columns.includes("tasks") ? (
        <DisplayField label="Tasks">{row.openTaskCount}</DisplayField>
      ) : null}
    </dl>
  );
}

function HouseholdDisplayFields({
  columns,
  row,
}: {
  columns: ListColumnKey[];
  row: HouseholdListRow;
}) {
  return (
    <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] leading-tight">
      {columns.includes("lifecycle") && row.lifecycle.length > 0 ? (
        <LifecycleField labels={row.lifecycle} />
      ) : null}
      {columns.includes("tasks") ? (
        <DisplayField label="Tasks">{row.openTaskCount}</DisplayField>
      ) : null}
    </dl>
  );
}

function personSecondaryText(row: PersonListRow, includeCampus: boolean) {
  const campus = includeCampus ? row.primaryCampus?.name : null;
  const status = row.deceased ? "Deceased" : row.connectionStatus;

  return [campus, status, row.email].filter(Boolean).join(" · ");
}

function householdSecondaryText(row: HouseholdListRow, includeCampus: boolean) {
  const campus = includeCampus ? row.campus?.name : null;

  return [`${row.memberCount} members`, householdRockStatus(row), campus]
    .filter(Boolean)
    .join(" · ");
}

function householdRockStatus(row: HouseholdListRow) {
  if (row.archived) {
    return "Archived in Rock";
  }

  return row.active ? "Active in Rock" : "Inactive in Rock";
}

function PersonAvatar({ row }: { row: PersonListRow }) {
  if (row.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-8 w-8 shrink-0 rounded-[6px] border border-app-border-strong bg-app-soft object-cover"
        src={row.photoUrl}
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-app-border-strong bg-app-soft font-mono text-[10px] font-semibold text-app-muted">
      {initialsForName(row.displayName)}
    </div>
  );
}

function HouseholdAvatar({
  members,
  name,
}: {
  members: HouseholdListRow["primaryContacts"];
  name: string;
}) {
  const tiles = members.slice(0, 4);
  const gridClass =
    tiles.length <= 1
      ? "grid-cols-1"
      : tiles.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 grid-rows-2";

  return (
    <div
      aria-label={`${name} household members`}
      className={`grid h-8 w-8 shrink-0 overflow-hidden rounded-[6px] bg-app-soft ${gridClass}`}
      role="img"
    >
      {tiles.length > 0 ? (
        tiles.map((member) => (
          <HouseholdAvatarTile key={member.rockId} member={member} />
        ))
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[10px] font-semibold text-app-muted">
          {initialsForName(name)}
        </div>
      )}
    </div>
  );
}

function HouseholdAvatarTile({
  member,
}: {
  member: HouseholdListRow["primaryContacts"][number];
}) {
  return (
    <div className="flex min-h-0 min-w-0 items-center justify-center border-[0.5px] border-app-surface bg-app-chip font-mono text-[8px] font-semibold text-app-muted">
      {member.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          src={member.photoUrl}
        />
      ) : (
        initialsForName(member.displayName)
      )}
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

function normalizeColumns(columns: ListColumnKey[] = defaultListColumns) {
  const selected = columns.filter((column) =>
    defaultListColumns.includes(column),
  );

  return selected.length > 0 ? selected : defaultListColumns;
}

function DisplayField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex min-w-0 max-w-full items-baseline gap-1.5">
      <dt className="shrink-0 font-mono text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </dt>
      <dd className="min-w-0 truncate font-medium text-app-foreground">
        {children}
      </dd>
    </div>
  );
}

function LifecycleField({
  labels,
}: {
  labels: Array<{ lifecycle: string; summary: string }>;
}) {
  const text = labels
    .map((label) => label.lifecycle.replace("_", " "))
    .join(", ");
  const title = labels.map((label) => label.summary).join("\n");

  return (
    <span
      className="min-w-0 truncate font-medium text-app-foreground"
      title={title}
    >
      {text}
    </span>
  );
}

function PledgeColumn({
  amountsHidden,
  summary,
}: {
  amountsHidden: boolean;
  summary: PersonListRow["pledgeSummary"] | null;
}) {
  return (
    <div
      aria-label="Pledges"
      className="min-w-0 pt-1 text-[12px] leading-tight md:py-0"
    >
      {!amountsHidden && summary && !pledgeSummaryIsEmpty(summary) ? (
        <div className="grid min-w-0 gap-1">
          <PledgeSummaryEntries items={summary.active} stage="Active" />
          <PledgeSummaryEntries items={summary.draft} stage="Draft" />
          <PledgeSummaryEntries items={summary.review} stage="Review" />
        </div>
      ) : null}
    </div>
  );
}

type PledgeStage = "Active" | "Draft" | "Review";

function PledgeSummaryEntries({
  items,
  stage,
}: {
  items: PledgeListItem[];
  stage: PledgeStage;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {items.map((item) => (
        <span
          className="flex min-w-0 items-center gap-1.5"
          key={`${stage}:${item.accountName}:${item.amount}:${item.period}`}
          title={`${formatPledgeItem(item)} (${stage})`}
        >
          <PledgeStageIcon stage={stage} />
          <span className="min-w-0 truncate font-medium leading-4 text-app-foreground">
            {formatPledgeItem(item)}
          </span>
        </span>
      ))}
    </>
  );
}

function PledgeStageIcon({ stage }: { stage: PledgeStage }) {
  return (
    <span
      aria-label={`${stage} pledge`}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center ${pledgeStageColor(stage)}`}
      title={stage}
    >
      {stage === "Active" ? (
        <CircleCheck
          aria-hidden="true"
          className="h-3.5 w-3.5"
          strokeWidth={2.2}
        />
      ) : null}
      {stage === "Draft" ? (
        <FilePenLine
          aria-hidden="true"
          className="h-3.5 w-3.5"
          strokeWidth={2.2}
        />
      ) : null}
      {stage === "Review" ? (
        <SearchCheck
          aria-hidden="true"
          className="h-3.5 w-3.5"
          strokeWidth={2.2}
        />
      ) : null}
    </span>
  );
}

function pledgeStageColor(stage: PledgeStage) {
  const colors: Record<PledgeStage, string> = {
    Active: "text-emerald-600",
    Draft: "text-app-muted",
    Review: "text-amber-500",
  };

  return colors[stage];
}

function pledgeSummaryIsEmpty(
  summary: NonNullable<PersonListRow["pledgeSummary"]>,
) {
  return (
    summary.active.length === 0 &&
    summary.draft.length === 0 &&
    summary.review.length === 0
  );
}

function formatPledgeItem(item: PledgeListItem) {
  return `${item.accountName} ${formatCurrency(item.amount)}/${formatPledgePeriod(
    item.period,
  )}`;
}

function formatCurrency(amount: string) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return amount;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    style: "currency",
  }).format(value);
}

function formatPledgePeriod(period: PledgeListItem["period"]) {
  const labels: Record<PledgeListItem["period"], string> = {
    ANNUALLY: "yr",
    FORTNIGHTLY: "fortnight",
    MONTHLY: "mo",
    QUARTERLY: "qtr",
    WEEKLY: "wk",
  };

  return labels[period] ?? period.toLowerCase();
}
