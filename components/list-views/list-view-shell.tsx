import Link from "next/link";
import type { ReactNode } from "react";

import { createCommunicationPrepFromAudienceAction } from "@/app/communications/actions";
import {
  AutoSubmitChoice,
  AutoSubmitInput,
  AutoSubmitSelect,
} from "@/components/list-views/auto-submit-controls";
import {
  defaultListColumns,
  type ListColumnKey,
} from "@/lib/list-views/columns";
import { InfiniteListTable } from "@/components/list-views/infinite-list-table";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import type { HouseholdsConnection } from "@/lib/list-views/households-list";
import type { PeopleConnection } from "@/lib/list-views/people-list";
import type { FilterFieldDefinition } from "@/lib/list-views/filter-schema";
import type { ListViewShellFilters } from "@/lib/list-views/page-params";

type ListViewShellProps =
  | {
      ageGroup?: string | null;
      catalog: FilterFieldDefinition[];
      columns: ListColumnKey[];
      connection: PeopleConnection;
      filterDefinitionJson: string;
      filters?: ListViewShellFilters;
      kind: "people";
      lifecycle?: string | null;
      query?: string | null;
    }
  | {
      catalog: FilterFieldDefinition[];
      columns: ListColumnKey[];
      connection: HouseholdsConnection;
      filterDefinitionJson: string;
      filters?: ListViewShellFilters;
      kind: "households";
      lifecycle?: string | null;
      query?: string | null;
    };

export function ListViewShell(props: ListViewShellProps) {
  const action = props.kind === "people" ? "/people" : "/households";
  const ageGroup = props.kind === "people" ? props.ageGroup : null;
  const activeFilters = activeFilterChips({
    ageGroup,
    filters: props.filters,
    lifecycle: props.lifecycle,
    query: props.query,
  });
  const resetHref = props.kind === "people" ? "/people" : "/households";
  const selectedColumns = normalizeSelectedColumns(props.columns);
  const columnsChanged =
    selectedColumns.join(",") !== defaultListColumns.join(",");

  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav active={props.kind} />
      <main className="h-[calc(100vh-48px)] overflow-hidden lg:pl-[320px]">
        <section className="min-w-0">
          <div className="lg:contents">
            <aside className="border-b border-app-border bg-app-surface lg:fixed lg:bottom-0 lg:left-0 lg:top-12 lg:z-20 lg:w-[320px] lg:border-b-0 lg:border-r">
              <form
                action={action}
                className="flex max-h-[calc(100vh-48px)] flex-col overflow-hidden"
              >
                <div className="flex min-h-14 items-center border-b border-app-border bg-app-background/60 px-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeFilters.length > 0 ? (
                      activeFilters.map((filter) => (
                        <span
                          className="inline-flex h-8 items-center rounded-full border border-app-border bg-app-background px-3 text-[12px] font-medium leading-none text-app-foreground"
                          key={`${filter.label}:${filter.value}`}
                        >
                          <span className="text-app-muted">{filter.label}</span>{" "}
                          {filter.value}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex h-8 items-center rounded-full border border-app-border bg-app-background px-3 text-[12px] font-medium leading-none text-app-muted">
                        Default view
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 overflow-y-auto px-3 py-3">
                  <SidebarSection title="Search">
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
                  </SidebarSection>

                  <SidebarSection title="Lifecycle signals">
                    <div className="grid grid-cols-2 gap-2">
                      {quickLifecycleFilters.map((filter) => (
                        <label
                          className="flex min-h-8 items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[12px] font-semibold text-app-foreground has-[:checked]:border-app-accent has-[:checked]:bg-app-accent/10 has-[:checked]:text-app-accent-strong"
                          key={filter.value}
                        >
                          <AutoSubmitChoice
                            className="h-3.5 w-3.5 accent-app-accent"
                            defaultChecked={
                              props.lifecycle?.toUpperCase() === filter.value
                            }
                            name="lifecycle"
                            type="radio"
                            value={filter.value}
                          />
                          {filter.label}
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-[12px] font-medium text-app-muted">
                      <AutoSubmitChoice
                        className="h-3.5 w-3.5 accent-app-accent"
                        defaultChecked={!props.lifecycle}
                        name="lifecycle"
                        type="radio"
                        value=""
                      />
                      Any lifecycle
                    </label>
                  </SidebarSection>

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

                  <AdvancedFilterPanel
                    filters={props.filters}
                    kind={props.kind}
                  />

                  <SidebarSection title="Columns">
                    <ColumnPanel selectedColumns={selectedColumns} />
                  </SidebarSection>
                </div>

                {activeFilters.length > 0 || columnsChanged ? (
                  <div className="border-t border-app-border bg-app-background/60 px-3 py-3">
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

            <div className="min-w-0 overflow-hidden">
              <ListWorkspaceHeader
                filterDefinitionJson={props.filterDefinitionJson}
                kind={props.kind}
                resultCount={props.connection.edges.length}
                viewName={props.connection.appliedView.name}
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
                  })}`}
                  kind="people"
                  queryString={infiniteQueryString({
                    ageGroup,
                    columns: selectedColumns,
                    filters: props.filters,
                    lifecycle: props.lifecycle,
                    query: props.query,
                  })}
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
  filterDefinitionJson,
  kind,
  resultCount,
  viewName,
}: {
  filterDefinitionJson: string;
  kind: "households" | "people";
  resultCount: number;
  viewName: string;
}) {
  const resource = kind === "people" ? "PEOPLE" : "HOUSEHOLDS";
  const title = `${viewName} communication prep`;

  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-app-border bg-app-background px-4 py-3">
      <div className="grid gap-1">
        <h1 className="text-[18px] font-semibold leading-tight text-app-foreground">
          {kind === "people" ? "People" : "Households"}
        </h1>
        <p className="text-[12px] font-medium text-app-muted">
          {viewName} · {resultCount} loaded
        </p>
      </div>
      <form action={createCommunicationPrepFromAudienceAction}>
        <input
          name="filterDefinitionJson"
          type="hidden"
          value={filterDefinitionJson}
        />
        <input name="resource" type="hidden" value={resource} />
        <input name="title" type="hidden" value={title} />
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-accent bg-app-accent px-3 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(30,92,120,0.22)] hover:bg-app-accent-strong focus:outline-none focus:ring-2 focus:ring-app-accent/30"
          type="submit"
        >
          Prepare communication
        </button>
      </form>
    </div>
  );
}

const quickLifecycleFilters = [
  { label: "New", value: "NEW" },
  { label: "Reactivated", value: "REACTIVATED" },
  { label: "At risk", value: "AT_RISK" },
  { label: "Dropped", value: "DROPPED" },
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

const columnOptions: Array<{ label: string; value: ListColumnKey }> = [
  { label: "Campus", value: "campus" },
  { label: "Lifecycle", value: "lifecycle" },
  { label: "Tasks", value: "tasks" },
  { label: "Giving signal", value: "giving" },
];

function AdvancedFilterPanel({
  filters,
  kind,
}: {
  filters?: ListViewShellFilters;
  kind: "households" | "people";
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3">
        <PanelTextField
          defaultValue={filters?.campus}
          label="Campus"
          name="campus"
          placeholder="Campus number"
        />
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
        {kind === "people" ? (
          <>
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
            <PanelSelect
              defaultValue={filters?.connectGroup}
              label="Connect Group"
              name="connectGroup"
              options={booleanOptions}
            />
          </>
        ) : (
          <>
            <PanelSelect
              defaultValue={filters?.active}
              label="Active household"
              name="active"
              options={booleanOptions}
            />
            <PanelSelect
              defaultValue={filters?.emailCapable}
              label="Email-capable member"
              name="emailCapable"
              options={booleanOptions}
            />
            <PanelSelect
              defaultValue={filters?.connectGroup}
              label="Connect Group member"
              name="connectGroup"
              options={booleanOptions}
            />
            <PanelSelect
              defaultValue={filters?.archived}
              label="Archived"
              name="archived"
              options={booleanOptions}
            />
          </>
        )}
      </div>
    </div>
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

function SidebarSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PanelTextField({
  defaultValue,
  label,
  name,
  placeholder,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </span>
      <AutoSubmitInput
        className="min-h-9 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none placeholder:text-app-muted/75 focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
        defaultValue={defaultValue ?? ""}
        name={name}
        placeholder={placeholder}
      />
    </label>
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
    <label className="grid gap-2">
      <span className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </span>
      <AutoSubmitSelect
        className="min-h-9 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] font-medium text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
        defaultValue={defaultValue ?? ""}
        name={name}
        options={options}
      />
    </label>
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
  filters,
  lifecycle,
  query,
}: {
  ageGroup?: string | null;
  filters?: ListViewShellFilters;
  lifecycle?: string | null;
  query?: string | null;
}) {
  const chips: Array<{ label: string; value: string }> = [];

  if (query?.trim()) {
    chips.push({ label: "Search", value: query.trim() });
  }

  if (lifecycle?.trim()) {
    chips.push({
      label: "Lifecycle",
      value: lifecycleLabel(lifecycle.trim()),
    });
  }

  if (ageGroup?.trim()) {
    chips.push({
      label: "Age",
      value: ageGroupLabel(ageGroup.trim()),
    });
  }

  if (filters?.campus?.trim()) {
    chips.push({ label: "Campus", value: filters.campus.trim() });
  }

  if (filters?.taskStatus?.trim()) {
    chips.push({
      label: "Task",
      value: titleCase(filters.taskStatus.trim()),
    });
  }

  if (filters?.taskPriority?.trim()) {
    chips.push({
      label: "Priority",
      value: titleCase(filters.taskPriority.trim()),
    });
  }

  if (filters?.emailStatus?.trim()) {
    chips.push({ label: "Email", value: titleCase(filters.emailStatus) });
  }

  if (filters?.connectGroup === "true" || filters?.connectGroup === "false") {
    chips.push({
      label: "Connect Group",
      value: filters.connectGroup === "true" ? "Yes" : "No",
    });
  }

  if (filters?.active === "true" || filters?.active === "false") {
    chips.push({
      label: "Active",
      value: filters.active === "true" ? "Yes" : "No",
    });
  }

  if (filters?.archived === "true" || filters?.archived === "false") {
    chips.push({
      label: "Archived",
      value: filters.archived === "true" ? "Yes" : "No",
    });
  }

  if (filters?.emailCapable === "true" || filters?.emailCapable === "false") {
    chips.push({
      label: "Email member",
      value: filters.emailCapable === "true" ? "Yes" : "No",
    });
  }

  return chips;
}

function listFilterQuery(filters?: ListViewShellFilters) {
  return {
    ...(filters?.active ? { active: filters.active } : {}),
    ...(filters?.archived ? { archived: filters.archived } : {}),
    ...(filters?.campus ? { campus: filters.campus } : {}),
    ...(filters?.connectGroup ? { connectGroup: filters.connectGroup } : {}),
    ...(filters?.emailCapable ? { emailCapable: filters.emailCapable } : {}),
    ...(filters?.emailStatus ? { emailStatus: filters.emailStatus } : {}),
    ...(filters?.taskPriority ? { taskPriority: filters.taskPriority } : {}),
    ...(filters?.taskStatus ? { taskStatus: filters.taskStatus } : {}),
  };
}

function infiniteQueryString({
  ageGroup,
  columns,
  filters,
  lifecycle,
  query,
}: {
  ageGroup?: string | null;
  columns: ListColumnKey[];
  filters?: ListViewShellFilters;
  lifecycle?: string | null;
  query?: string | null;
}) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (lifecycle) params.set("lifecycle", lifecycle);
  if (ageGroup) params.set("ageGroup", ageGroup);
  for (const [key, value] of Object.entries(listFilterQuery(filters))) {
    params.set(key, value);
  }
  params.set("columns", columns.join(","));

  return params.toString();
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
