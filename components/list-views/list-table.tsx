import Link from "next/link";

import type {
  HouseholdListRow,
  HouseholdsConnection,
} from "@/lib/list-views/households-list";
import type {
  PeopleConnection,
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
  const tableColumnCount = 1 + visibleColumns.length;
  const minTableWidth = tableMinWidth(visibleColumns.length);

  return (
    <div className="bg-app-surface" style={{ minWidth: minTableWidth }}>
      <table className="w-full border-separate border-spacing-0 text-left text-[13px]">
        <ColumnGroup columnCount={visibleColumns.length} />
        <thead className="text-[11px] uppercase text-app-muted">
          <tr className="h-14">
            <TableHead>Name</TableHead>
            {visibleColumns.includes("campus") ? (
              <TableHead>Campus</TableHead>
            ) : null}
            {visibleColumns.includes("lifecycle") ? (
              <TableHead>Lifecycle</TableHead>
            ) : null}
            {visibleColumns.includes("tasks") ? (
              <TableHead>Tasks</TableHead>
            ) : null}
            {visibleColumns.includes("giving") ? (
              <TableHead>Giving signal</TableHead>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {connection.edges.length === 0 ? (
            <tr>
              <td
                className="px-4 py-8 text-center text-app-muted"
                colSpan={tableColumnCount}
              >
                No records match this view.
              </td>
            </tr>
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
        </tbody>
      </table>
    </div>
  );
}

function TableHead({ children }: { children: string }) {
  return (
    <th className="sticky top-0 z-20 border-b border-app-border bg-app-soft px-4 py-0 align-middle font-semibold leading-none">
      <span className="flex h-14 items-center">{children}</span>
    </th>
  );
}

function ColumnGroup({ columnCount }: { columnCount: number }) {
  return (
    <colgroup>
      <col style={{ width: 360 }} />
      {Array.from({ length: columnCount }).map((_, index) => (
        <col key={index} style={{ width: 180 }} />
      ))}
    </colgroup>
  );
}

function tableMinWidth(columnCount: number) {
  return 360 + columnCount * 180;
}

function PeopleRow({
  columns,
  row,
}: {
  columns: ListColumnKey[];
  row: PersonListRow;
}) {
  return (
    <tr className="border-t border-app-border hover:bg-app-surface-subtle">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar row={row} />
          <div className="min-w-0">
            <Link
              className="font-semibold text-app-accent"
              href={`/people/${row.rockId}`}
            >
              {row.displayName}
            </Link>
            <div className="truncate text-[12px] text-app-muted">
              {row.email ?? "No email"}
            </div>
          </div>
        </div>
      </td>
      {columns.includes("campus") ? (
        <td className="px-4 py-3">{row.primaryCampus?.name ?? "Unassigned"}</td>
      ) : null}
      {columns.includes("lifecycle") ? (
        <LifecycleCell labels={row.lifecycle} />
      ) : null}
      {columns.includes("tasks") ? (
        <td className="px-4 py-3">{row.openTaskCount}</td>
      ) : null}
      {columns.includes("giving") ? (
        <GivingCell
          amountsHidden={row.amountsHidden}
          summary={row.givingSummary}
        />
      ) : null}
    </tr>
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
    <tr className="border-t border-app-border hover:bg-app-surface-subtle">
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <HouseholdAvatar members={row.primaryContacts} name={row.name} />
          <div className="min-w-0">
            <Link
              className="font-semibold text-app-accent"
              href={`/households/${row.rockId}`}
            >
              {row.name}
            </Link>
            <div className="truncate text-[12px] text-app-muted">
              {row.memberCount} members
            </div>
          </div>
        </div>
      </td>
      {columns.includes("campus") ? (
        <td className="px-4 py-3">{row.campus?.name ?? "Unassigned"}</td>
      ) : null}
      {columns.includes("lifecycle") ? (
        <LifecycleCell labels={row.lifecycle} />
      ) : null}
      {columns.includes("tasks") ? (
        <td className="px-4 py-3">{row.openTaskCount}</td>
      ) : null}
      {columns.includes("giving") ? (
        <GivingCell
          amountsHidden={row.amountsHidden}
          summary={row.givingSummary}
        />
      ) : null}
    </tr>
  );
}

function PersonAvatar({ row }: { row: PersonListRow }) {
  if (row.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-9 w-9 shrink-0 rounded-[7px] border border-app-border-strong bg-app-soft object-cover"
        src={row.photoUrl}
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-app-border-strong bg-app-soft font-mono text-[11px] font-semibold text-app-muted">
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
      className={`grid h-9 w-9 shrink-0 overflow-hidden rounded-[7px] bg-app-soft ${gridClass}`}
      role="img"
    >
      {tiles.length > 0 ? (
        tiles.map((member) => (
          <HouseholdAvatarTile key={member.rockId} member={member} />
        ))
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[11px] font-semibold text-app-muted">
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

function LifecycleCell({
  labels,
}: {
  labels: Array<{ lifecycle: string; summary: string }>;
}) {
  return (
    <td className="px-4 py-3">
      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <span
              className="rounded-[4px] border border-app-border bg-app-background px-2 py-1 text-[11px] font-semibold text-app-foreground"
              key={`${label.lifecycle}-${label.summary}`}
              title={label.summary}
            >
              {label.lifecycle.replace("_", " ")}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-app-muted">None</span>
      )}
    </td>
  );
}

function GivingCell({
  amountsHidden,
  summary,
}: {
  amountsHidden: boolean;
  summary: PersonListRow["givingSummary"] | HouseholdListRow["givingSummary"];
}) {
  if (amountsHidden) {
    return <td className="px-4 py-3 text-app-muted">Care signal only</td>;
  }

  return (
    <td className="px-4 py-3">
      {summary ? (
        <>
          <div className="font-semibold text-app-foreground">
            ${Number(summary.lastTwelveMonthsTotal).toLocaleString("en-US")}
          </div>
          <div className="text-[12px] text-app-muted">Trailing 12 months</div>
        </>
      ) : (
        <span className="text-app-muted">No giving facts</span>
      )}
    </td>
  );
}
