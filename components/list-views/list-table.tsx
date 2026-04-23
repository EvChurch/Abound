import { CircleCheck, FilePenLine, SearchCheck } from "lucide-react";
import Link from "next/link";

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
  const showSignalColumn = showPledgeColumn || Boolean(row.givingSummary);

  return (
    <article
      className="border-b border-app-border bg-app-surface px-4 py-2.5 text-[13px] transition-colors hover:bg-app-surface-subtle"
      role="listitem"
    >
      <div
        className={
          showSignalColumn
            ? "grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] md:items-stretch"
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
        {showSignalColumn ? (
          <GivingSignalColumn
            givingSummary={row.givingSummary}
            pledgeSummary={showPledgeColumn ? row.pledgeSummary : null}
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
    <MetadataLine
      labels={columns.includes("lifecycle") ? row.lifecycle : []}
      taskCount={columns.includes("tasks") ? row.openTaskCount : null}
    />
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
    <MetadataLine
      labels={columns.includes("lifecycle") ? row.lifecycle : []}
      taskCount={columns.includes("tasks") ? row.openTaskCount : null}
    />
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

function MetadataLine({
  labels,
  taskCount,
}: {
  labels: Array<{ lifecycle: string; summary: string }>;
  taskCount: number | null;
}) {
  const visibleTaskCount = taskCount && taskCount > 0 ? taskCount : null;

  if (labels.length === 0 && visibleTaskCount === null) {
    return null;
  }

  return (
    <div className="mt-1 min-w-0 truncate text-[12px] font-medium leading-tight text-app-foreground">
      {labels.length > 0 ? <LifecycleField labels={labels} /> : null}
      {labels.length > 0 && visibleTaskCount !== null ? (
        <span className="text-app-muted"> · </span>
      ) : null}
      {visibleTaskCount !== null ? formatTaskCount(visibleTaskCount) : null}
    </div>
  );
}

function LifecycleField({
  labels,
}: {
  labels: Array<{ lifecycle: string; summary: string }>;
}) {
  const title = labels.map((label) => label.summary).join("\n");

  return (
    <span className="min-w-0 truncate font-medium" title={title}>
      {labels.map((label, index) => (
        <span key={`${label.lifecycle}:${index}`}>
          {index > 0 ? <span className="text-app-muted">, </span> : null}
          <span className={lifecycleTone(label.lifecycle)}>
            {formatLifecycle(label.lifecycle)}
          </span>
        </span>
      ))}
    </span>
  );
}

function formatLifecycle(value: string) {
  const labels: Record<string, string> = {
    AT_RISK: "At risk",
    DROPPED: "Dropped",
    NEW: "New",
    REACTIVATED: "Reactivated",
  };

  return labels[value] ?? value.replaceAll("_", " ").toLowerCase();
}

function formatTaskCount(count: number) {
  return `${count} ${count === 1 ? "task" : "tasks"}`;
}

function lifecycleTone(value: string) {
  const tones: Record<string, string> = {
    AT_RISK: "text-amber-800",
    DROPPED: "text-rose-800",
    NEW: "text-sky-800",
    REACTIVATED: "text-emerald-800",
  };

  return tones[value] ?? "text-app-foreground";
}

function GivingSignalColumn({
  givingSummary,
  pledgeSummary,
}: {
  givingSummary: PersonListRow["givingSummary"];
  pledgeSummary: PersonListRow["pledgeSummary"] | null;
}) {
  const showPledges = pledgeSummary && !pledgeSummaryIsEmpty(pledgeSummary);

  return (
    <div className="relative -mb-2.5 -mr-4 min-h-10 min-w-0 overflow-hidden pb-2.5 pr-4 pt-1 text-[12px] leading-tight md:-my-2.5 md:py-2.5">
      {givingSummary ? <GivingSparkline summary={givingSummary} /> : null}
      {givingSummary ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-2/3 bg-gradient-to-r from-app-surface via-app-surface/90 to-transparent"
        />
      ) : null}
      {showPledges ? (
        <div aria-label="Pledges" className="relative z-10 grid min-w-0 gap-1">
          <PledgeSummaryEntries items={pledgeSummary.active} stage="Active" />
          <PledgeSummaryEntries items={pledgeSummary.draft} stage="Draft" />
          <PledgeSummaryEntries items={pledgeSummary.review} stage="Review" />
        </div>
      ) : null}
    </div>
  );
}

function GivingSparkline({
  summary,
}: {
  summary: NonNullable<PersonListRow["givingSummary"]>;
}) {
  const paths = sparklinePaths(summary.monthlyGiving);

  if (!paths) {
    return null;
  }

  return (
    <svg
      aria-label="Giving trend over the last 12 months"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full text-app-muted"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 120 32"
    >
      <title>Giving trend over the last 12 months</title>
      <path d={paths.area} fill="currentColor" opacity="0.08" stroke="none" />
      <path
        d={paths.line}
        fill="none"
        opacity="0.18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function sparklinePaths(
  monthlyGiving: NonNullable<PersonListRow["givingSummary"]>["monthlyGiving"],
) {
  const months = sparklineMonths(monthlyGiving);

  if (months.length === 0) {
    return null;
  }

  const values = months.map((month) => decimalToNumber(month.totalGiven));
  const max = Math.max(...values);
  const bounds = {
    height: 32,
    width: 120,
  };
  const xStep = months.length > 1 ? bounds.width / (months.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = months.length === 1 ? bounds.width : index * xStep;
    const normalized = max <= 0 ? 0 : value / max;
    const y = bounds.height - normalized * bounds.height;

    return clampSparklinePoint(
      {
        x: roundSparklineCoordinate(x),
        y: roundSparklineCoordinate(y),
      },
      bounds,
    );
  });
  const line =
    points.length === 1
      ? singlePointPath(points[0], bounds)
      : points.slice(1).reduce((path, point, index) => {
          const previousPoint = points[index];
          const startControlPoint = controlPoint(
            points[index - 1] ?? previousPoint,
            previousPoint,
            point,
            bounds,
          );
          const endControlPoint = controlPoint(
            points[index + 2] ?? point,
            point,
            previousPoint,
            bounds,
          );

          return `${path} C ${startControlPoint.x} ${startControlPoint.y}, ${endControlPoint.x} ${endControlPoint.y}, ${point.x} ${point.y}`;
        }, `M ${points[0].x} ${points[0].y}`);

  return {
    area: `${line} L ${bounds.width} ${bounds.height} L 0 ${bounds.height} Z`,
    line,
  };
}

function sparklineMonths(
  monthlyGiving: NonNullable<PersonListRow["givingSummary"]>["monthlyGiving"],
) {
  const months = monthlyGiving.slice(-12);
  const latestMonth = months.at(-1);

  if (latestMonth && decimalToNumber(latestMonth.totalGiven) === 0) {
    return months.slice(0, -1);
  }

  return months;
}

function singlePointPath(point: SparklinePoint, bounds: SparklineBounds) {
  return `M 0 ${point.y} L ${bounds.width} ${point.y}`;
}

function clampSparklinePoint(
  point: SparklinePoint,
  bounds: SparklineBounds,
): SparklinePoint {
  return {
    x: roundSparklineCoordinate(clamp(point.x, 0, bounds.width)),
    y: roundSparklineCoordinate(clamp(point.y, 0, bounds.height)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function controlPoint(
  adjacent: SparklinePoint,
  current: SparklinePoint,
  opposite: SparklinePoint,
  bounds: SparklineBounds,
): SparklinePoint {
  return clampSparklinePoint(
    {
      x: current.x + (opposite.x - adjacent.x) / 6,
      y: current.y + (opposite.y - adjacent.y) / 6,
    },
    bounds,
  );
}

type SparklinePoint = {
  x: number;
  y: number;
};

type SparklineBounds = {
  height: number;
  width: number;
};

function decimalToNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function roundSparklineCoordinate(value: number) {
  return Math.round(value * 10) / 10;
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
