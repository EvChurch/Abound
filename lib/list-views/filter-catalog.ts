import { hasPermission, type AppRole, type Permission } from "@/lib/auth/roles";
import {
  operatorsForFieldType,
  type FilterFieldDefinition,
  type FilterFieldType,
  type ListViewResource,
} from "@/lib/list-views/filter-schema";

type CatalogFieldInput = {
  fieldType: FilterFieldType;
  id: string;
  label: string;
  permission?: Permission;
  resource: ListViewResource;
};

const BASE_FIELDS: CatalogFieldInput[] = [
  field("PEOPLE", "search", "Name or email", "STRING"),
  field("PEOPLE", "recordStatus", "Record status", "ENUM"),
  field("PEOPLE", "deceased", "Deceased", "BOOLEAN"),
  field("PEOPLE", "emailPresent", "Email present", "BOOLEAN"),
  field("PEOPLE", "emailActive", "Email active", "BOOLEAN"),
  field("PEOPLE", "primaryCampusRockId", "Primary campus", "ID"),
  field("PEOPLE", "primaryHouseholdRockId", "Primary household", "ID"),
  field("PEOPLE", "givingHouseholdRockId", "Giving household", "ID"),
  field("PEOPLE", "ageGroup", "Adults or children", "ENUM"),
  field("PEOPLE", "activeConnectGroup", "Active Connect Group", "BOOLEAN"),
  field("PEOPLE", "taskStatus", "Task status", "ENUM"),
  field("PEOPLE", "taskPriority", "Task priority", "ENUM"),
  field("PEOPLE", "taskAssigneeUserId", "Task assignee", "ID"),
  field("PEOPLE", "taskDueAt", "Task due date", "DATE"),
  field("PEOPLE", "lifecycle", "Giving lifecycle", "ENUM"),
  field("PEOPLE", "givingRecency", "Giving recency", "DATE"),
  field("PEOPLE", "reliabilityKind", "Giving reliability", "ENUM"),
  field("PEOPLE", "accountRockId", "Fund/account", "ID"),
  field("PEOPLE", "pledgeStatus", "Pledge state", "ENUM"),
  field("HOUSEHOLDS", "search", "Household name", "STRING"),
  field("HOUSEHOLDS", "active", "Active", "BOOLEAN"),
  field("HOUSEHOLDS", "archived", "Archived", "BOOLEAN"),
  field("HOUSEHOLDS", "campusRockId", "Campus", "ID"),
  field("HOUSEHOLDS", "memberCount", "Member count", "NUMBER"),
  field(
    "HOUSEHOLDS",
    "hasEmailCapableMember",
    "Email-capable member",
    "BOOLEAN",
  ),
  field(
    "HOUSEHOLDS",
    "hasActiveConnectGroupMember",
    "Connect Group member",
    "BOOLEAN",
  ),
  field("HOUSEHOLDS", "taskStatus", "Task status", "ENUM"),
  field("HOUSEHOLDS", "taskPriority", "Task priority", "ENUM"),
  field("HOUSEHOLDS", "taskAssigneeUserId", "Task assignee", "ID"),
  field("HOUSEHOLDS", "taskDueAt", "Task due date", "DATE"),
  field("HOUSEHOLDS", "lifecycle", "Giving lifecycle", "ENUM"),
  field("HOUSEHOLDS", "givingRecency", "Giving recency", "DATE"),
  field("HOUSEHOLDS", "reliabilityKind", "Giving reliability", "ENUM"),
  field("HOUSEHOLDS", "accountRockId", "Fund/account", "ID"),
  field("HOUSEHOLDS", "pledgeStatus", "Pledge state", "ENUM"),
  field("PEOPLE", "totalGiven", "Total given", "MONEY", "finance:read_amounts"),
  field(
    "PEOPLE",
    "lastGiftAmount",
    "Last gift amount",
    "MONEY",
    "finance:read_amounts",
  ),
  field(
    "PEOPLE",
    "trailingPeriodTotal",
    "Trailing-period total",
    "MONEY",
    "finance:read_amounts",
  ),
  field(
    "PEOPLE",
    "amountChange",
    "Amount change",
    "MONEY",
    "finance:read_amounts",
  ),
  field(
    "HOUSEHOLDS",
    "totalGiven",
    "Household total given",
    "MONEY",
    "finance:read_amounts",
  ),
  field(
    "HOUSEHOLDS",
    "lastGiftAmount",
    "Last gift amount",
    "MONEY",
    "finance:read_amounts",
  ),
  field(
    "HOUSEHOLDS",
    "trailingPeriodTotal",
    "Trailing-period total",
    "MONEY",
    "finance:read_amounts",
  ),
  field(
    "HOUSEHOLDS",
    "amountChange",
    "Amount change",
    "MONEY",
    "finance:read_amounts",
  ),
];

export function getListViewFilterCatalog(
  resource: ListViewResource,
  role: AppRole,
): FilterFieldDefinition[] {
  return BASE_FIELDS.filter((candidate) => {
    return (
      candidate.resource === resource &&
      (!candidate.permission || hasPermission(role, candidate.permission))
    );
  }).map((candidate) => ({
    ...candidate,
    operators: operatorsForFieldType(candidate.fieldType),
  }));
}

export function getListViewField(
  resource: ListViewResource,
  role: AppRole,
  fieldId: string,
) {
  return getListViewFilterCatalog(resource, role).find(
    (field) => field.id === fieldId,
  );
}

function field(
  resource: ListViewResource,
  id: string,
  label: string,
  fieldType: FilterFieldType,
  permission?: Permission,
): CatalogFieldInput {
  return {
    fieldType,
    id,
    label,
    permission,
    resource,
  };
}
