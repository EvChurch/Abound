import Link from "next/link";
import { HeartPulse, List } from "lucide-react";

import {
  AutoSubmitChoice,
  AutoSubmitInput,
  AutoSubmitSelect,
} from "@/components/list-views/auto-submit-controls";
import { ColumnsMenu } from "@/components/list-views/columns-menu";
import {
  FilterAccordion,
  type FilterAccordionItem,
} from "@/components/list-views/filter-accordion";
import {
  defaultListColumns,
  type ListColumnKey,
} from "@/lib/list-views/columns";
import type { CampusFilterOption } from "@/lib/list-views/campus-options";
import { InfiniteListTable } from "@/components/list-views/infinite-list-table";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import type { HouseholdsConnection } from "@/lib/list-views/households-list";
import type { PeopleConnection } from "@/lib/list-views/people-list";
import type { ConnectionStatusFilterOption } from "@/lib/list-views/connection-status-options";
import type { FilterFieldDefinition } from "@/lib/list-views/filter-schema";
import type {
  ListViewShellFilters,
  PageParamValue,
  PeopleViewMode,
} from "@/lib/list-views/page-params";
import type { RecordStatusFilterOption } from "@/lib/list-views/record-status-options";

type ListViewShellProps =
  | {
      ageGroup?: string | null;
      campusOptions: CampusFilterOption[];
      catalog: FilterFieldDefinition[];
      columns: ListColumnKey[];
      connection: PeopleConnection;
      canManageSettings?: boolean;
      canManageTools?: boolean;
      filters?: ListViewShellFilters;
      kind: "people";
      lifecycle?: PageParamValue | null;
      query?: string | null;
      sort?: string | null;
      connectionStatusOptions: ConnectionStatusFilterOption[];
      recordStatusOptions: RecordStatusFilterOption[];
      viewMode?: PeopleViewMode;
    }
  | {
      campusOptions: CampusFilterOption[];
      catalog: FilterFieldDefinition[];
      columns: ListColumnKey[];
      connection: HouseholdsConnection;
      canManageSettings?: boolean;
      canManageTools?: boolean;
      filters?: ListViewShellFilters;
      kind: "households";
      lifecycle?: PageParamValue | null;
      query?: string | null;
    };

export function ListViewShell(props: ListViewShellProps) {
  const action = props.kind === "people" ? "/people" : "/households";
  const ageGroup = props.kind === "people" ? props.ageGroup : null;
  const selectedColumns = normalizeSelectedColumns(props.columns);
  const columnsChanged =
    selectedColumns.join(",") !== defaultListColumns.join(",");
  const activeFilters = activeFilterChips({
    ageGroup,
    campusOptions: props.campusOptions,
    filters: props.filters,
    lifecycle: props.lifecycle,
    query: props.query,
  });
  const viewMode = props.kind === "people" ? (props.viewMode ?? "list") : null;
  const sort = props.kind === "people" ? normalizePeopleSort(props.sort) : null;
  const resetHref =
    props.kind === "people"
      ? viewMode === "giving"
        ? "/people?view=giving"
        : "/people"
      : "/households";
  const lifecycleValues = filterValues(props.lifecycle);
  const lifecycleCount = lifecycleValues.length;
  const audienceCount =
    (queryHasValue(ageGroup) ? 1 : 0) +
    (queryHasValue(props.filters?.campus) ? 1 : 0);
  const statusCount =
    props.kind === "people"
      ? filterValues(props.filters?.connectionStatus).length +
        filterValues(props.filters?.recordStatus).length
      : queryHasValue(props.filters?.rockStatus)
        ? 1
        : 0;
  const activityCount =
    (queryHasValue(props.filters?.taskStatus) ? 1 : 0) +
    (queryHasValue(props.filters?.taskPriority) ? 1 : 0) +
    (queryHasValue(props.filters?.connectGroup) ? 1 : 0);
  const pledgeCount =
    props.kind === "people"
      ? filterValues(props.filters?.pledgeState).length
      : 0;
  const householdGivingCount =
    props.kind === "people" &&
    queryHasValue(props.filters?.householdGivingState)
      ? 1
      : 0;
  const contactCount =
    props.kind === "people"
      ? queryHasValue(props.filters?.emailStatus)
        ? 1
        : 0
      : queryHasValue(props.filters?.emailCapable)
        ? 1
        : 0;
  const accordionItems: FilterAccordionItem[] = [
    {
      children: (
        <PanelMultiChoice
          label="Lifecycle signal"
          name="lifecycle"
          options={quickLifecycleFilters}
          selectedValues={lifecycleValues}
        />
      ),
      count: lifecycleCount,
      defaultOpen: lifecycleCount > 0,
      id: "lifecycle",
      title: "Lifecycle signals",
    },
    {
      children: (
        <div className="grid gap-3">
          <PanelSelect
            defaultValue={props.filters?.campus}
            label="Campus"
            name="campus"
            options={[
              { label: "Any campus", value: "" },
              ...props.campusOptions,
            ]}
          />
          {props.kind === "people" ? (
            <PanelSelect
              defaultValue={ageGroup ?? "ADULTS"}
              label="Age group"
              name="ageGroup"
              options={[
                { label: "Adults", value: "ADULTS" },
                { label: "Children", value: "CHILDREN" },
                { label: "Adults and children", value: "ALL" },
              ]}
            />
          ) : null}
        </div>
      ),
      count: audienceCount,
      defaultOpen: audienceCount > 0,
      id: "audience",
      title: "Audience",
    },
    {
      children: (
        <StatusPanel
          connectionStatusOptions={
            props.kind === "people" ? props.connectionStatusOptions : []
          }
          filters={props.filters}
          kind={props.kind}
          recordStatusOptions={
            props.kind === "people" ? props.recordStatusOptions : []
          }
        />
      ),
      count: statusCount,
      defaultOpen:
        statusCount > 0 ||
        (props.kind === "people" &&
          lifecycleCount === 0 &&
          audienceCount === 0 &&
          pledgeCount === 0),
      id: "status",
      title: props.kind === "people" ? "Person status" : "Household status",
    },
    {
      children: <ActivityPanel filters={props.filters} kind={props.kind} />,
      count: activityCount,
      defaultOpen: activityCount > 0,
      id: "activity",
      title: "Activity",
    },
    ...(props.kind === "people"
      ? [
          {
            children: <PledgeManagementPanel filters={props.filters} />,
            count: pledgeCount,
            defaultOpen: pledgeCount > 0,
            id: "pledge-management",
            title: "Pledge",
          },
          {
            children: <HouseholdGivingPanel filters={props.filters} />,
            count: householdGivingCount,
            defaultOpen: householdGivingCount > 0,
            id: "household-giving",
            title: "Household giving",
          },
        ]
      : []),
    {
      children: <ContactPanel filters={props.filters} kind={props.kind} />,
      count: contactCount,
      defaultOpen: contactCount > 0,
      id: "contact",
      title: "Contact",
    },
  ];

  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav
        active={props.kind}
        canManageSettings={props.canManageSettings}
        canManageTools={props.canManageTools}
      />
      <main className="h-[calc(100vh-48px)] min-h-0 overflow-hidden md:pl-[300px] xl:pl-[320px]">
        <section className="h-full min-h-0 min-w-0">
          <div className="h-full min-h-0 md:contents">
            <aside className="border-b border-app-border bg-app-surface md:fixed md:bottom-0 md:left-0 md:top-12 md:z-20 md:w-[300px] md:border-b-0 md:border-r xl:w-[320px]">
              <form action={action} className="flex h-full flex-col">
                {viewMode === "giving" ? (
                  <input name="view" type="hidden" value="giving" />
                ) : null}
                <div className="border-b border-app-border bg-app-background/60 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-semibold uppercase text-app-muted">
                      Filters
                    </span>
                    {activeFilters.length > 0 ? (
                      <span className="rounded-full bg-app-chip px-2 py-0.5 text-[11px] font-semibold text-app-muted">
                        {activeFilters.length === 1
                          ? "1 active"
                          : `${activeFilters.length} active`}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeFilters.length > 0 ? (
                      activeFilters.map((filter) => (
                        <span
                          className="inline-flex min-h-8 max-w-full items-stretch overflow-hidden rounded-[6px] border border-app-border bg-app-surface text-[12px] font-medium leading-none text-app-foreground shadow-[0_1px_1px_rgba(20,18,14,0.03)]"
                          key={`${filter.label}:${filter.value}`}
                        >
                          <span className="inline-flex min-w-0 items-center gap-2 px-2.5 py-1.5">
                            <span className="shrink-0 font-mono text-[10px] font-semibold uppercase text-app-muted">
                              {filter.label}
                            </span>
                            <span className="truncate">{filter.value}</span>
                          </span>
                          <Link
                            aria-label={`Clear ${filter.label} filter`}
                            className="inline-flex w-7 shrink-0 items-center justify-center border-l border-app-border text-[13px] font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/25"
                            href={clearFilterHref({
                              action,
                              ageGroup,
                              columns: selectedColumns,
                              columnsChanged,
                              filters: props.filters,
                              lifecycle: props.lifecycle,
                              query: props.query,
                              sort,
                              target: filter.param,
                              viewMode,
                            })}
                          >
                            x
                          </Link>
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex min-h-8 items-center rounded-[6px] border border-dashed border-app-border bg-app-surface px-2.5 text-[12px] font-medium leading-none text-app-muted">
                        Default view
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-b border-app-border bg-app-surface px-3 py-3">
                  <div className="grid gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase text-app-muted">
                      Search
                    </span>
                    <label className="grid gap-2">
                      <span className="sr-only">Search</span>
                      <AutoSubmitInput
                        className="min-h-9 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none placeholder:text-app-muted/75 focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                        defaultValue={props.query ?? ""}
                        name="q"
                        placeholder={
                          props.kind === "people"
                            ? "Name or email"
                            : "Household name"
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <FilterAccordion items={accordionItems} />
                </div>

                {activeFilters.length > 0 || columnsChanged ? (
                  <div className="shrink-0 border-t border-app-border bg-app-background/60 px-3 py-3">
                    <Link
                      className="inline-flex min-h-9 w-full items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground"
                      href={resetHref}
                    >
                      Reset
                    </Link>
                  </div>
                ) : null}
              </form>
            </aside>

            <div className="flex h-full min-w-0 flex-col overflow-hidden">
              <ListWorkspaceHeader
                action={action}
                ageGroup={ageGroup}
                connection={props.connection}
                filters={props.filters}
                kind={props.kind}
                lifecycle={props.lifecycle}
                query={props.query}
                selectedColumns={selectedColumns}
                sort={sort}
                viewMode={viewMode}
              />
              {props.kind === "people" ? (
                <InfiniteListTable
                  columns={selectedColumns}
                  connection={props.connection}
                  key={`people:${infiniteQueryString({
                    ageGroup,
                    columns: selectedColumns,
                    filters: props.filters,
                    lifecycle: props.lifecycle,
                    query: props.query,
                    savedViewId: props.connection.appliedView.id,
                    sort,
                  })}`}
                  kind="people"
                  queryString={infiniteQueryString({
                    ageGroup,
                    columns: selectedColumns,
                    filters: props.filters,
                    lifecycle: props.lifecycle,
                    query: props.query,
                    savedViewId: props.connection.appliedView.id,
                    sort,
                  })}
                  viewMode={viewMode}
                />
              ) : (
                <InfiniteListTable
                  columns={selectedColumns}
                  connection={props.connection}
                  key={`households:${infiniteQueryString({
                    columns: selectedColumns,
                    filters: props.filters,
                    lifecycle: props.lifecycle,
                    query: props.query,
                  })}`}
                  kind="households"
                  queryString={infiniteQueryString({
                    columns: selectedColumns,
                    filters: props.filters,
                    lifecycle: props.lifecycle,
                    query: props.query,
                  })}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ListWorkspaceHeader({
  action,
  ageGroup,
  connection,
  filters,
  kind,
  lifecycle,
  query,
  selectedColumns,
  sort,
  viewMode,
}: {
  action: "/households" | "/people";
  ageGroup?: string | null;
  connection: HouseholdsConnection | PeopleConnection;
  filters?: ListViewShellFilters;
  kind: "households" | "people";
  lifecycle?: PageParamValue | null;
  query?: string | null;
  selectedColumns: ListColumnKey[];
  sort?: PeopleSortOption | null;
  viewMode: PeopleViewMode | null;
}) {
  const countSummary =
    kind === "people"
      ? peopleCountSummary(connection as PeopleConnection)
      : null;

  return (
    <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-app-border bg-app-background px-4 py-3">
      <div className="min-w-0">
        <h1 className="text-[18px] font-semibold leading-tight text-app-foreground">
          {kind === "people" ? "People" : "Households"}
        </h1>
        {countSummary ? (
          <p className="mt-0.5 text-[12px] font-medium text-app-muted">
            {countSummary}
          </p>
        ) : null}
      </div>
      <form action={action} className="shrink-0">
        <PreservedQueryInputs
          ageGroup={ageGroup}
          filters={filters}
          lifecycle={lifecycle}
          query={query}
          sort={sort}
        />
        <div className="flex items-center gap-2">
          {kind === "people" ? (
            <>
              <PeopleSortControl sort={sort ?? "firstName"} />
              <PeopleViewModeControl
                action="/people"
                ageGroup={ageGroup}
                filters={filters}
                lifecycle={lifecycle}
                query={query}
                selectedColumns={selectedColumns}
                sort={sort}
                viewMode={viewMode ?? "list"}
              />
            </>
          ) : null}
          <ColumnsMenu>
            <ColumnPanel selectedColumns={selectedColumns} />
          </ColumnsMenu>
        </div>
      </form>
    </div>
  );
}

function peopleCountSummary(connection: PeopleConnection) {
  if (!connection.resultCount) {
    return null;
  }

  const filtered = formatCount(connection.resultCount.filtered);
  const total = formatCount(connection.resultCount.total);

  return `Showing ${filtered} of ${total} people`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

type PeopleSortOption = "firstName" | "lastName";

const peopleSortOptions: ReadonlyArray<{
  label: string;
  value: PeopleSortOption;
}> = [
  { label: "First name", value: "firstName" },
  { label: "Last name", value: "lastName" },
];

function PeopleSortControl({ sort }: { sort: PeopleSortOption }) {
  return (
    <label className="hidden items-center gap-2 text-[12px] font-semibold text-app-muted sm:flex">
      <span>Sort</span>
      <AutoSubmitSelect
        className="min-h-9 rounded-[6px] border border-app-border bg-app-surface px-2.5 text-[13px] font-semibold text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
        defaultValue={sort}
        name="sort"
        options={peopleSortOptions}
      />
    </label>
  );
}

function PeopleViewModeControl({
  action,
  ageGroup,
  filters,
  lifecycle,
  query,
  selectedColumns,
  sort,
  viewMode,
}: {
  action: "/people";
  ageGroup?: string | null;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  selectedColumns: ListColumnKey[];
  sort?: PeopleSortOption | null;
  viewMode: PeopleViewMode;
}) {
  const options = [
    { icon: List, label: "List", value: "list" },
    { icon: HeartPulse, label: "Giving lifecycle", value: "giving" },
  ] as const;

  return (
    <div
      aria-label="People visual"
      className="inline-flex h-9 overflow-hidden rounded-[6px] border border-app-border bg-app-surface shadow-[0_1px_2px_rgba(150,140,120,0.16)]"
      role="group"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === viewMode;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            aria-label={option.label}
            className={
              active
                ? "inline-flex min-w-9 items-center justify-center gap-1.5 border-r border-app-border bg-app-chip px-2.5 text-[12.5px] font-semibold text-app-foreground last:border-r-0"
                : "inline-flex min-w-9 items-center justify-center gap-1.5 border-r border-app-border px-2.5 text-[12.5px] font-semibold text-app-muted transition hover:bg-app-soft hover:text-app-foreground last:border-r-0"
            }
            href={peopleViewModeHref({
              action,
              ageGroup,
              filters,
              lifecycle,
              query,
              selectedColumns,
              sort,
              viewMode: option.value,
            })}
            key={option.value}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span className="hidden lg:inline">{option.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

const quickLifecycleFilters = [
  { label: "Healthy", value: "HEALTHY" },
  { label: "New", value: "NEW" },
  { label: "Reactivated", value: "REACTIVATED" },
  { label: "At risk", value: "AT_RISK" },
  { label: "Dropped", value: "DROPPED" },
  { label: "Lapsed", value: "LAPSED" },
  { label: "Never given", value: "NEVER_GIVEN" },
] as const;

const booleanOptions = [
  { label: "Any", value: "" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
] as const;

const taskStatusOptions = [
  { label: "Any", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
] as const;

const taskPriorityOptions = [
  { label: "Any", value: "" },
  { label: "Low", value: "LOW" },
  { label: "Normal", value: "NORMAL" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
] as const;

const householdRockStatusOptions = [
  { label: "Current household", value: "" },
  { label: "Archived household", value: "archived" },
  { label: "Inactive household", value: "inactive" },
  { label: "Any household status", value: "any" },
] as const;

const pledgeStateOptions = [
  { label: "Review recommended pledge", value: "review" },
  { label: "Active pledge", value: "active" },
  { label: "Draft pledge", value: "draft" },
] as const;

const householdGivingStateOptions = [
  { label: "Any household state", value: "" },
  { label: "Still giving", value: "STILL_GIVING" },
  { label: "Stopped", value: "STOPPED" },
] as const;

const columnOptions: Array<{ label: string; value: ListColumnKey }> = [
  { label: "Campus", value: "campus" },
  { label: "Lifecycle", value: "lifecycle" },
  { label: "Tasks", value: "tasks" },
  { label: "Pledges", value: "pledges" },
];

function StatusPanel({
  connectionStatusOptions,
  filters,
  kind,
  recordStatusOptions,
}: {
  connectionStatusOptions: ConnectionStatusFilterOption[];
  filters?: ListViewShellFilters;
  kind: "households" | "people";
  recordStatusOptions: RecordStatusFilterOption[];
}) {
  return kind === "people" ? (
    <div className="grid gap-3">
      <PanelMultiChoice
        selectedValues={filterValues(filters?.connectionStatus)}
        label="Connection status"
        name="connectionStatus"
        options={[...connectionStatusOptions]}
      />
      <PanelMultiChoice
        selectedValues={filterValues(filters?.recordStatus)}
        label="Record status"
        name="recordStatus"
        options={[...recordStatusOptions]}
      />
    </div>
  ) : (
    <PanelSelect
      defaultValue={filters?.rockStatus}
      label="Household status"
      name="rockStatus"
      options={householdRockStatusOptions}
    />
  );
}

function ActivityPanel({
  filters,
  kind,
}: {
  filters?: ListViewShellFilters;
  kind: "households" | "people";
}) {
  return (
    <div className="grid gap-3">
      <PanelSelect
        defaultValue={filters?.taskStatus}
        label="Task status"
        name="taskStatus"
        options={taskStatusOptions}
      />
      <PanelSelect
        defaultValue={filters?.taskPriority}
        label="Task priority"
        name="taskPriority"
        options={taskPriorityOptions}
      />
      <PanelSelect
        defaultValue={filters?.connectGroup}
        label={kind === "people" ? "Connect Group" : "Connect Group member"}
        name="connectGroup"
        options={booleanOptions}
      />
    </div>
  );
}

function PledgeManagementPanel({
  filters,
}: {
  filters?: ListViewShellFilters;
}) {
  return (
    <PanelMultiChoice
      label="Pledge state"
      name="pledgeState"
      options={pledgeStateOptions}
      selectedValues={filterValues(filters?.pledgeState).map((value) =>
        value.toLowerCase(),
      )}
    />
  );
}

function HouseholdGivingPanel({ filters }: { filters?: ListViewShellFilters }) {
  return (
    <PanelChoice
      selectedValue={filters?.householdGivingState ?? ""}
      label="Household state"
      name="householdGivingState"
      options={householdGivingStateOptions}
    />
  );
}

function PanelChoice({
  label,
  name,
  options,
  selectedValue,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  selectedValue: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[10px] font-semibold uppercase leading-none text-app-muted">
        {label}
      </div>
      <div className="grid gap-1 rounded-[6px] border border-app-border bg-app-background p-1.5">
        {options.map((option) => (
          <label
            className="flex min-h-8 items-center justify-between gap-3 rounded-[5px] px-2 text-[13px] font-medium text-app-foreground hover:bg-app-chip"
            key={option.value}
          >
            <span className="min-w-0 truncate">{option.label}</span>
            <AutoSubmitChoice
              key={`${name}:${option.value}:${
                selectedValue === option.value ? "checked" : "unchecked"
              }`}
              className="h-4 w-4 shrink-0 accent-app-accent"
              defaultChecked={selectedValue === option.value}
              name={name}
              type="radio"
              value={option.value}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ContactPanel({
  filters,
  kind,
}: {
  filters?: ListViewShellFilters;
  kind: "households" | "people";
}) {
  return kind === "people" ? (
    <PanelSelect
      defaultValue={filters?.emailStatus}
      label="Email status"
      name="emailStatus"
      options={[
        { label: "Any", value: "" },
        { label: "Active email", value: "active" },
        { label: "Missing email", value: "missing" },
        { label: "Inactive email", value: "inactive" },
      ]}
    />
  ) : (
    <PanelSelect
      defaultValue={filters?.emailCapable}
      label="Email-capable member"
      name="emailCapable"
      options={booleanOptions}
    />
  );
}

function ColumnPanel({
  selectedColumns,
}: {
  selectedColumns: ListColumnKey[];
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        {columnOptions.map((option) => (
          <label
            className="flex items-center justify-between gap-3 rounded-[6px] border border-app-border bg-app-background px-2.5 py-1.5 text-[13px] font-medium text-app-foreground"
            key={option.value}
          >
            <span>{option.label}</span>
            <AutoSubmitChoice
              key={`column:${option.value}:${
                selectedColumns.includes(option.value) ? "checked" : "unchecked"
              }`}
              className="h-4 w-4 accent-app-accent"
              defaultChecked={selectedColumns.includes(option.value)}
              name="column"
              type="checkbox"
              value={option.value}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function PreservedQueryInputs({
  ageGroup,
  filters,
  lifecycle,
  query,
  sort,
}: {
  ageGroup?: string | null;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  sort?: PeopleSortOption | null;
}) {
  const entries: Array<[string, string]> = [];

  if (sort && sort !== "firstName") entries.push(["sort", sort]);
  if (query) entries.push(["q", query]);
  for (const value of filterValues(lifecycle)) {
    entries.push(["lifecycle", value]);
  }
  if (ageGroup) entries.push(["ageGroup", ageGroup]);

  for (const [key, value] of Object.entries(listFilterQuery(filters))) {
    if (Array.isArray(value)) {
      for (const item of value) {
        entries.push([key, item]);
      }
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

function PanelSelect({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[10px] font-semibold uppercase leading-none text-app-muted">
        {label}
      </div>
      <AutoSubmitSelect
        key={`${name}:${defaultValue ?? ""}`}
        className="flex min-h-9 w-full items-center justify-between rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] font-medium text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
        defaultValue={defaultValue ?? ""}
        name={name}
        options={options}
      />
    </div>
  );
}

function PanelMultiChoice({
  label,
  name,
  options,
  selectedValues,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  selectedValues: string[];
}) {
  const selected = new Set(selectedValues);

  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[10px] font-semibold uppercase leading-none text-app-muted">
        {label}
      </div>
      <div className="grid gap-1 rounded-[6px] border border-app-border bg-app-background p-1.5">
        {options.length > 0 ? (
          options.map((option) => (
            <label
              className="flex min-h-8 items-center justify-between gap-3 rounded-[5px] px-2 text-[13px] font-medium text-app-foreground hover:bg-app-chip"
              key={option.value}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              <AutoSubmitChoice
                key={`${name}:${option.value}:${
                  selected.has(option.value) ? "checked" : "unchecked"
                }`}
                className="h-4 w-4 shrink-0 accent-app-accent"
                defaultChecked={selected.has(option.value)}
                name={name}
                type="checkbox"
                value={option.value}
              />
            </label>
          ))
        ) : (
          <span className="px-2 py-1.5 text-[12px] font-medium text-app-muted">
            No options available
          </span>
        )}
      </div>
    </div>
  );
}

function normalizeSelectedColumns(columns: ListColumnKey[]) {
  const selected = columns.filter((column) =>
    defaultListColumns.includes(column),
  );

  return selected.length > 0 ? selected : defaultListColumns;
}

function activeFilterChips({
  ageGroup,
  campusOptions,
  filters,
  lifecycle,
  query,
}: {
  ageGroup?: string | null;
  campusOptions: CampusFilterOption[];
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
}) {
  const chips: Array<{
    label: string;
    param: ListFilterParam;
    value: string;
  }> = [];
  const lifecycleValues = filterValues(lifecycle);

  if (query?.trim()) {
    chips.push({ label: "Search", param: "q", value: query.trim() });
  }

  if (lifecycleValues.length > 0) {
    chips.push({
      label: "Lifecycle",
      param: "lifecycle",
      value: lifecycleValues.map(lifecycleLabel).join(", "),
    });
  }

  if (ageGroup?.trim()) {
    chips.push({
      label: "Age",
      param: "ageGroup",
      value: ageGroupLabel(ageGroup.trim()),
    });
  }

  if (filters?.campus?.trim()) {
    chips.push({
      label: "Campus",
      param: "campus",
      value: campusOptionLabel(filters.campus.trim(), campusOptions),
    });
  }

  if (filters?.taskStatus?.trim()) {
    chips.push({
      label: "Task",
      param: "taskStatus",
      value: titleCase(filters.taskStatus.trim()),
    });
  }

  if (filters?.taskPriority?.trim()) {
    chips.push({
      label: "Priority",
      param: "taskPriority",
      value: titleCase(filters.taskPriority.trim()),
    });
  }

  if (filters?.emailStatus?.trim()) {
    chips.push({
      label: "Email",
      param: "emailStatus",
      value: titleCase(filters.emailStatus),
    });
  }

  const connectionStatuses = filterValues(filters?.connectionStatus);

  if (connectionStatuses.length > 0) {
    chips.push({
      label: "Connection",
      param: "connectionStatus",
      value: connectionStatuses.join(", "),
    });
  }

  const recordStatuses = filterValues(filters?.recordStatus);

  if (recordStatuses.length > 0) {
    chips.push({
      label: "Record",
      param: "recordStatus",
      value: recordStatuses.join(", "),
    });
  }

  if (filters?.rockStatus?.trim()) {
    chips.push({
      label: "Household",
      param: "rockStatus",
      value: householdRockStatusLabel(filters.rockStatus.trim()),
    });
  }

  if (filters?.connectGroup === "true" || filters?.connectGroup === "false") {
    chips.push({
      label: "Connect Group",
      param: "connectGroup",
      value: filters.connectGroup === "true" ? "Yes" : "No",
    });
  }

  if (filters?.householdGivingState?.trim()) {
    chips.push({
      label: "Household giving",
      param: "householdGivingState",
      value: householdGivingStateLabel(filters.householdGivingState.trim()),
    });
  }

  const pledgeStates = filterValues(filters?.pledgeState);

  if (pledgeStates.length > 0) {
    chips.push({
      label: "Pledge",
      param: "pledgeState",
      value: pledgeStates.map(pledgeStateLabel).join(", "),
    });
  }

  if (filters?.active === "true" || filters?.active === "false") {
    chips.push({
      label: "Active",
      param: "active",
      value: filters.active === "true" ? "Yes" : "No",
    });
  }

  if (filters?.archived === "true" || filters?.archived === "false") {
    chips.push({
      label: "Archived",
      param: "archived",
      value: filters.archived === "true" ? "Yes" : "No",
    });
  }

  if (filters?.emailCapable === "true" || filters?.emailCapable === "false") {
    chips.push({
      label: "Email member",
      param: "emailCapable",
      value: filters.emailCapable === "true" ? "Yes" : "No",
    });
  }

  return chips;
}

function campusOptionLabel(value: string, campusOptions: CampusFilterOption[]) {
  return campusOptions.find((option) => option.value === value)?.label ?? value;
}

type ListFilterParam =
  | "active"
  | "ageGroup"
  | "archived"
  | "campus"
  | "connectionStatus"
  | "connectGroup"
  | "emailCapable"
  | "emailStatus"
  | "householdGivingState"
  | "lifecycle"
  | "pledgeState"
  | "q"
  | "recordStatus"
  | "rockStatus"
  | "taskPriority"
  | "taskStatus";

function clearFilterHref({
  action,
  ageGroup,
  columns,
  columnsChanged,
  filters,
  lifecycle,
  query,
  sort,
  target,
  viewMode,
}: {
  action: "/households" | "/people";
  ageGroup?: string | null;
  columns: ListColumnKey[];
  columnsChanged: boolean;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  sort?: PeopleSortOption | null;
  target: ListFilterParam;
  viewMode?: PeopleViewMode | null;
}) {
  const params = new URLSearchParams();

  if (viewMode === "giving") params.set("view", "giving");
  if (sort && sort !== "firstName") params.set("sort", sort);
  if (query) params.set("q", query);
  for (const value of filterValues(lifecycle)) {
    params.append("lifecycle", value);
  }
  if (ageGroup) params.set("ageGroup", ageGroup);
  appendListFilterQuery(params, filters);
  if (columnsChanged) params.set("columns", columns.join(","));

  params.delete(target);

  const queryString = params.toString();

  return queryString ? `${action}?${queryString}` : action;
}

function peopleViewModeHref({
  action,
  ageGroup,
  filters,
  lifecycle,
  query,
  selectedColumns,
  sort,
  viewMode,
}: {
  action: "/people";
  ageGroup?: string | null;
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  selectedColumns: ListColumnKey[];
  sort?: PeopleSortOption | null;
  viewMode: PeopleViewMode;
}) {
  const params = new URLSearchParams();

  if (sort && sort !== "firstName") params.set("sort", sort);
  if (query) params.set("q", query);
  for (const value of filterValues(lifecycle)) {
    params.append("lifecycle", value);
  }
  if (ageGroup) params.set("ageGroup", ageGroup);
  appendListFilterQuery(params, filters);
  params.set("columns", selectedColumns.join(","));
  params.set("view", viewMode);

  return `${action}?${params.toString()}`;
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

function appendListFilterQuery(
  params: URLSearchParams,
  filters?: ListViewShellFilters,
) {
  for (const [key, value] of Object.entries(listFilterQuery(filters))) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.set(key, value);
    }
  }
}

function householdRockStatusLabel(value: string) {
  const labels: Record<string, string> = {
    any: "Any status",
    archived: "Archived",
    inactive: "Inactive",
  };

  return labels[value] ?? value;
}

function householdGivingStateLabel(value: string) {
  const labels: Record<string, string> = {
    STILL_GIVING: "Still giving",
    STOPPED: "Stopped",
  };

  return labels[value] ?? value;
}

function infiniteQueryString({
  ageGroup,
  columns,
  filters,
  lifecycle,
  query,
  savedViewId,
  sort,
}: {
  ageGroup?: string | null;
  columns: ListColumnKey[];
  filters?: ListViewShellFilters;
  lifecycle?: PageParamValue | null;
  query?: string | null;
  savedViewId?: string | null;
  sort?: PeopleSortOption | null;
}) {
  const params = new URLSearchParams();

  if (savedViewId) params.set("savedViewId", savedViewId);
  if (sort && (sort !== "firstName" || savedViewId)) {
    params.set("sort", sort);
  }
  if (query) params.set("q", query);
  for (const value of filterValues(lifecycle)) {
    params.append("lifecycle", value);
  }
  if (ageGroup) params.set("ageGroup", ageGroup);
  appendListFilterQuery(params, filters);
  params.set("columns", columns.join(","));

  return params.toString();
}

function filterValues(value?: string | string[] | null) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values.map((item) => item.trim()).filter(Boolean);
}

function queryHasValue(value?: string | string[] | null) {
  return filterValues(value).length > 0;
}

function normalizePeopleSort(value?: string | null): PeopleSortOption {
  return value === "lastName" ? value : "firstName";
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lifecycleLabel(value: string) {
  const labels: Record<string, string> = {
    AT_RISK: "At risk",
    DROPPED: "Dropped",
    HEALTHY: "Healthy",
    LAPSED: "Lapsed",
    NEVER_GIVEN: "Never given",
    NEW: "New",
    REACTIVATED: "Reactivated",
  };

  return labels[value.toUpperCase()] ?? value;
}

function ageGroupLabel(value: string) {
  const labels: Record<string, string> = {
    ADULTS: "Adults",
    ALL: "Adults and children",
    CHILD: "Children",
    CHILDREN: "Children",
  };

  return labels[value.toUpperCase()] ?? value;
}

function pledgeStateLabel(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    DRAFT: "Draft",
    REVIEW: "Review",
  };

  return labels[value.toUpperCase()] ?? value;
}
