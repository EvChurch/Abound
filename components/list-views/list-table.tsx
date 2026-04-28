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
            ? "grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-stretch"
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
      {givingSummary ? (
        <GivingSparkline
          pledgeSummary={pledgeSummary}
          summary={givingSummary}
        />
      ) : null}
      {givingSummary ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-[120px] bg-gradient-to-r from-app-surface via-app-surface/35 to-transparent"
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
  pledgeSummary,
}: {
  summary: NonNullable<PersonListRow["givingSummary"]>;
  pledgeSummary: PersonListRow["pledgeSummary"] | null;
}) {
  const chart = givingBarChart(summary.monthlyGiving, pledgeSummary);

  if (!chart) {
    return null;
  }

  return (
    <svg
      aria-label="Giving trend over the last 12 months"
      className="pointer-events-none absolute inset-y-0 right-0 z-0 h-full w-[120px] text-app-muted"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 120 32"
    >
      <title>Giving trend over the last 12 months</title>
      {chart.pledgeLine ? (
        <line
          stroke={chart.pledgeLine.stroke}
          strokeDasharray="4 3"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          x1="0"
          x2={chart.width}
          y1={chart.pledgeLine.y}
          y2={chart.pledgeLine.y}
        />
      ) : null}
      {chart.bars.map((bar) => (
        <rect
          fill="currentColor"
          height={bar.height}
          key={bar.key}
          opacity="0.14"
          rx="1.5"
          width={bar.width}
          x={bar.x}
          y={bar.y}
        />
      ))}
    </svg>
  );
}

function givingBarChart(
  monthlyGiving: NonNullable<PersonListRow["givingSummary"]>["monthlyGiving"],
  pledgeSummary: PersonListRow["pledgeSummary"] | null,
) {
  const months = sparklineMonths(monthlyGiving);

  if (months.length === 0) {
    return null;
  }

  const width = 120;
  const height = 32;
  const chartPaddingTop = 2;
  const chartPaddingBottom = 2;
  const barGap = 1.5;
  const values = months.map((month) => decimalToNumber(month.totalGiven));
  const pledgeLine = resolvePledgeLine(pledgeSummary);
  const maxValue = pledgeLine
    ? Math.max(pledgeLine.amount * 2, 1)
    : Math.max(...values, 1);
  const chartHeight = height - chartPaddingTop - chartPaddingBottom;
  const barWidth = Math.max(
    2,
    (width - barGap * (months.length - 1)) / months.length,
  );
  const yForValue = (value: number) =>
    height - chartPaddingBottom - (value / maxValue) * chartHeight;

  return {
    bars: values.map((value, index) => {
      const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
      const barHeight = (safeValue / maxValue) * chartHeight;
      const x = index * (barWidth + barGap);
      const y = height - chartPaddingBottom - barHeight;

      return {
        height: roundSparklineCoordinate(barHeight),
        key: `${months[index]?.month ?? index}-${value}`,
        width: roundSparklineCoordinate(barWidth),
        x: roundSparklineCoordinate(x),
        y: roundSparklineCoordinate(y),
      };
    }),
    height,
    pledgeLine: pledgeLine
      ? {
          stroke: pledgeLine.stroke,
          y: roundSparklineCoordinate(yForValue(pledgeLine.amount)),
        }
      : null,
    width,
  };
}

function sparklineMonths(
  monthlyGiving: NonNullable<PersonListRow["givingSummary"]>["monthlyGiving"],
) {
  return monthlyGiving.slice(-12);
}

function decimalToNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function resolvePledgeLine(
  pledgeSummary: PersonListRow["pledgeSummary"] | null,
) {
  const activeAmount = pledgeItemsMonthlyAmount(pledgeSummary?.active ?? []);

  if (activeAmount > 0) {
    return {
      amount: activeAmount,
      stroke: "rgba(22, 163, 74, 0.78)",
    };
  }

  const reviewAmount = pledgeItemsMonthlyAmount(pledgeSummary?.review ?? []);

  if (reviewAmount > 0) {
    return {
      amount: reviewAmount,
      stroke: "rgba(176, 89, 47, 0.78)",
    };
  }

  return null;
}

function pledgeItemsMonthlyAmount(items: PledgeListItem[]) {
  return items.reduce(
    (total, item) =>
      total + pledgeAmountToMonthlyNumber(item.amount, item.period),
    0,
  );
}

function pledgeAmountToMonthlyNumber(
  amount: string,
  period: PledgeListItem["period"],
) {
  const numericAmount = decimalToNumber(amount);

  switch (period) {
    case "WEEKLY":
      return (numericAmount * 52) / 12;
    case "FORTNIGHTLY":
      return (numericAmount * 26) / 12;
    case "MONTHLY":
      return numericAmount;
    case "QUARTERLY":
      return numericAmount / 3;
    case "ANNUALLY":
      return numericAmount / 12;
  }
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
