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
  connectionStatus?: PageParamValue;
  connectGroup?: string;
  emailStatus?: string;
  lifecycle?: PageParamValue;
  pledgeState?: PageParamValue;
  q?: string;
  recordStatus?: PageParamValue;
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
  lifecycle?: PageParamValue;
  q?: string;
  rockStatus?: string;
  taskPriority?: string;
  taskStatus?: string;
};

export type ListViewShellFilters = {
  active?: string | null;
  archived?: string | null;
  campus?: string | null;
  connectionStatus?: PageParamValue | null;
  connectGroup?: string | null;
  emailCapable?: string | null;
  emailStatus?: string | null;
  recordStatus?: PageParamValue | null;
  pledgeState?: PageParamValue | null;
  rockStatus?: string | null;
  taskPriority?: string | null;
  taskStatus?: string | null;
};

export function peopleFiltersFromParams(
  params: PeopleListQueryParams,
): ListViewShellFilters {
  return {
    campus: params.campus,
    connectionStatus: params.connectionStatus,
    connectGroup: params.connectGroup,
    emailStatus: params.emailStatus,
    pledgeState: params.pledgeState,
    recordStatus: params.recordStatus,
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
    rockStatus: params.rockStatus,
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

  const lifecycleValues = valuesFromParam(params.lifecycle);

  if (lifecycleValues.length === 1) {
    conditions.push(condition("lifecycle", "EQUALS", lifecycleValues[0]));
  } else if (lifecycleValues.length > 1) {
    conditions.push(condition("lifecycle", "IN", lifecycleValues));
  }

  if (params.ageGroup?.trim()) {
    conditions.push(condition("ageGroup", "EQUALS", params.ageGroup.trim()));
  }

  if (params.campus?.trim()) {
    conditions.push(
      condition("primaryCampusRockId", "EQUALS", params.campus.trim()),
    );
  }

  const connectionStatuses = valuesFromParam(params.connectionStatus);

  if (connectionStatuses.length === 1) {
    conditions.push(
      condition("connectionStatus", "EQUALS", connectionStatuses[0]),
    );
  } else if (connectionStatuses.length > 1) {
    conditions.push(condition("connectionStatus", "IN", connectionStatuses));
  }

  const recordStatuses = valuesFromParam(params.recordStatus);

  if (recordStatuses.length === 1) {
    conditions.push(condition("recordStatus", "EQUALS", recordStatuses[0]));
  } else if (recordStatuses.length > 1) {
    conditions.push(condition("recordStatus", "IN", recordStatuses));
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

  const pledgeStates = valuesFromParam(params.pledgeState)
    .map(pledgeStateValue)
    .filter((value): value is PledgeStateValue => Boolean(value));

  if (pledgeStates.length === 1) {
    conditions.push(condition("pledgeState", "EQUALS", pledgeStates[0]));
  } else if (pledgeStates.length > 1) {
    conditions.push(condition("pledgeState", "IN", pledgeStates));
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

  const lifecycleValues = valuesFromParam(params.lifecycle);

  if (lifecycleValues.length === 1) {
    conditions.push(condition("lifecycle", "EQUALS", lifecycleValues[0]));
  } else if (lifecycleValues.length > 1) {
    conditions.push(condition("lifecycle", "IN", lifecycleValues));
  }

  if (params.campus?.trim()) {
    conditions.push(condition("campusRockId", "EQUALS", params.campus.trim()));
  }

  if (params.rockStatus === "archived") {
    conditions.push(condition("archived", "EQUALS", true));
  }

  if (params.rockStatus === "inactive") {
    conditions.push(condition("active", "EQUALS", false));
    conditions.push(condition("archived", "EQUALS", false));
  }

  if (params.rockStatus === "any") {
    conditions.push(condition("active", "EXISTS", true));
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
    connectionStatus: valuesFromSearch(searchParams, "connectionStatus"),
    connectGroup: valueFromSearch(searchParams, "connectGroup"),
    emailCapable: valueFromSearch(searchParams, "emailCapable"),
    emailStatus: valueFromSearch(searchParams, "emailStatus"),
    lifecycle: valuesFromSearch(searchParams, "lifecycle"),
    pledgeState: valuesFromSearch(searchParams, "pledgeState"),
    q: valueFromSearch(searchParams, "q"),
    recordStatus: valuesFromSearch(searchParams, "recordStatus"),
    rockStatus: valueFromSearch(searchParams, "rockStatus"),
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

function valuesFromSearch(searchParams: URLSearchParams, key: string) {
  const values = searchParams.getAll(key).filter(Boolean);

  if (values.length === 0) {
    return undefined;
  }

  return values.length === 1 ? values[0] : values;
}

function valuesFromParam(value: PageParamValue | null) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values.map((item) => item.trim()).filter(Boolean);
}

type PledgeStateValue = "ACTIVE" | "DRAFT" | "REVIEW";

function pledgeStateValue(value: string): PledgeStateValue | null {
  const normalized = value.trim().toUpperCase();

  if (
    normalized === "REVIEW" ||
    normalized === "ACTIVE" ||
    normalized === "DRAFT"
  ) {
    return normalized;
  }

  return null;
}
