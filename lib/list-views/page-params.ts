import {
  defaultListColumns,
  type ListColumnKey,
} from "@/lib/list-views/columns";
import type {
  FilterDefinition,
  FilterOperator,
  FilterValue,
  FilterNode,
} from "@/lib/list-views/filter-schema";

export type PageParamValue = string | string[] | undefined;

export type PeopleListQueryParams = {
  after?: string;
  ageGroup?: string;
  campus?: string;
  column?: PageParamValue;
  columns?: string;
  connectGroup?: string;
  emailStatus?: string;
  lifecycle?: string;
  q?: string;
  taskPriority?: string;
  taskStatus?: string;
};

export type HouseholdListQueryParams = {
  active?: string;
  after?: string;
  archived?: string;
  campus?: string;
  column?: PageParamValue;
  columns?: string;
  connectGroup?: string;
  emailCapable?: string;
  lifecycle?: string;
  q?: string;
  taskPriority?: string;
  taskStatus?: string;
};

export type ListViewShellFilters = {
  active?: string | null;
  archived?: string | null;
  campus?: string | null;
  connectGroup?: string | null;
  emailCapable?: string | null;
  emailStatus?: string | null;
  taskPriority?: string | null;
  taskStatus?: string | null;
};

export function peopleFiltersFromParams(
  params: PeopleListQueryParams,
): ListViewShellFilters {
  return {
    campus: params.campus,
    connectGroup: params.connectGroup,
    emailStatus: params.emailStatus,
    taskPriority: params.taskPriority,
    taskStatus: params.taskStatus,
  };
}

export function householdFiltersFromParams(
  params: HouseholdListQueryParams,
): ListViewShellFilters {
  return {
    active: params.active,
    archived: params.archived,
    campus: params.campus,
    connectGroup: params.connectGroup,
    emailCapable: params.emailCapable,
    taskPriority: params.taskPriority,
    taskStatus: params.taskStatus,
  };
}

export function buildPeopleFilter(
  params: PeopleListQueryParams,
): FilterDefinition {
  const conditions: FilterNode[] = [];

  if (params.q?.trim()) {
    conditions.push(condition("search", "CONTAINS", params.q.trim()));
  }

  if (params.lifecycle?.trim()) {
    conditions.push(condition("lifecycle", "EQUALS", params.lifecycle.trim()));
  }

  if (params.ageGroup?.trim()) {
    conditions.push(condition("ageGroup", "EQUALS", params.ageGroup.trim()));
  }

  if (params.campus?.trim()) {
    conditions.push(
      condition("primaryCampusRockId", "EQUALS", params.campus.trim()),
    );
  }

  if (params.emailStatus === "active") {
    conditions.push(condition("emailActive", "EQUALS", true));
  }

  if (params.emailStatus === "inactive") {
    conditions.push(condition("emailActive", "EQUALS", false));
  }

  if (params.emailStatus === "missing") {
    conditions.push(condition("emailPresent", "EXISTS", false));
  }

  if (params.connectGroup === "true" || params.connectGroup === "false") {
    conditions.push(
      condition("activeConnectGroup", "EQUALS", params.connectGroup === "true"),
    );
  }

  if (params.taskStatus?.trim()) {
    conditions.push(
      condition("taskStatus", "EQUALS", params.taskStatus.trim()),
    );
  }

  if (params.taskPriority?.trim()) {
    conditions.push(
      condition("taskPriority", "EQUALS", params.taskPriority.trim()),
    );
  }

  return group(conditions);
}

export function buildHouseholdFilter(
  params: HouseholdListQueryParams,
): FilterDefinition {
  const conditions: FilterNode[] = [];

  if (params.q?.trim()) {
    conditions.push(condition("search", "CONTAINS", params.q.trim()));
  }

  if (params.lifecycle?.trim()) {
    conditions.push(condition("lifecycle", "EQUALS", params.lifecycle.trim()));
  }

  if (params.campus?.trim()) {
    conditions.push(condition("campusRockId", "EQUALS", params.campus.trim()));
  }

  if (params.active === "true" || params.active === "false") {
    conditions.push(condition("active", "EQUALS", params.active === "true"));
  }

  if (params.archived === "true" || params.archived === "false") {
    conditions.push(
      condition("archived", "EQUALS", params.archived === "true"),
    );
  }

  if (params.emailCapable === "true" || params.emailCapable === "false") {
    conditions.push(
      condition(
        "hasEmailCapableMember",
        "EQUALS",
        params.emailCapable === "true",
      ),
    );
  }

  if (params.connectGroup === "true" || params.connectGroup === "false") {
    conditions.push(
      condition(
        "hasActiveConnectGroupMember",
        "EQUALS",
        params.connectGroup === "true",
      ),
    );
  }

  if (params.taskStatus?.trim()) {
    conditions.push(
      condition("taskStatus", "EQUALS", params.taskStatus.trim()),
    );
  }

  if (params.taskPriority?.trim()) {
    conditions.push(
      condition("taskPriority", "EQUALS", params.taskPriority.trim()),
    );
  }

  return group(conditions);
}

export function parseColumns(params: {
  column?: PageParamValue;
  columns?: string;
}) {
  const values = Array.isArray(params.column)
    ? params.column
    : params.column
      ? [params.column]
      : (params.columns?.split(",") ?? []);
  const selected = values.filter((value): value is ListColumnKey =>
    defaultListColumns.includes(value as ListColumnKey),
  );

  return selected.length > 0 ? selected : defaultListColumns;
}

export function paramsFromSearch(searchParams: URLSearchParams) {
  return {
    active: valueFromSearch(searchParams, "active"),
    after: valueFromSearch(searchParams, "after"),
    ageGroup: valueFromSearch(searchParams, "ageGroup"),
    archived: valueFromSearch(searchParams, "archived"),
    campus: valueFromSearch(searchParams, "campus"),
    column: searchParams.getAll("column"),
    columns: valueFromSearch(searchParams, "columns"),
    connectGroup: valueFromSearch(searchParams, "connectGroup"),
    emailCapable: valueFromSearch(searchParams, "emailCapable"),
    emailStatus: valueFromSearch(searchParams, "emailStatus"),
    lifecycle: valueFromSearch(searchParams, "lifecycle"),
    q: valueFromSearch(searchParams, "q"),
    taskPriority: valueFromSearch(searchParams, "taskPriority"),
    taskStatus: valueFromSearch(searchParams, "taskStatus"),
  };
}

function group(conditions: FilterNode[]): FilterDefinition {
  return {
    conditions,
    mode: "all",
    type: "group",
  };
}

function condition(
  field: string,
  operator: FilterOperator,
  value: FilterValue,
): FilterNode {
  return {
    field,
    operator,
    type: "condition",
    value,
  };
}

function valueFromSearch(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key) ?? undefined;
}
