export const APP_ROLES = ["ADMIN", "FINANCE", "PASTORAL_CARE"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type Permission =
  | "finance:read_amounts"
  | "people:read_limited"
  | "people:read_care_context"
  | "pledges:manage"
  | "tasks:manage"
  | "communications:manage"
  | "settings:manage";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  ADMIN: [
    "finance:read_amounts",
    "people:read_limited",
    "people:read_care_context",
    "pledges:manage",
    "tasks:manage",
    "communications:manage",
    "settings:manage",
  ],
  FINANCE: ["finance:read_amounts", "people:read_limited", "pledges:manage"],
  PASTORAL_CARE: [
    "people:read_care_context",
    "tasks:manage",
    "communications:manage",
  ],
};

export function hasPermission(role: AppRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canSeeGivingAmounts(role: AppRole) {
  return hasPermission(role, "finance:read_amounts");
}

export function canSeeIndividualGivingAggregates(role: AppRole) {
  return role === "ADMIN" || role === "FINANCE";
}

export function canManageCareWorkflows(role: AppRole) {
  return hasPermission(role, "tasks:manage");
}
