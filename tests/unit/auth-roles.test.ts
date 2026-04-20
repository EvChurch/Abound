import { describe, expect, it } from "vitest";

import {
  APP_ROLES,
  canManageCareWorkflows,
  canSeeGivingAmounts,
  canSeeIndividualGivingAggregates,
  hasPermission,
  type Permission,
} from "@/lib/auth/roles";

describe("role permissions", () => {
  const expectedPermissions: Record<
    (typeof APP_ROLES)[number],
    Record<Permission, boolean>
  > = {
    ADMIN: {
      "finance:read_amounts": true,
      "people:read_limited": true,
      "people:read_care_context": true,
      "pledges:manage": true,
      "tasks:manage": true,
      "communications:manage": true,
      "settings:manage": true,
    },
    FINANCE: {
      "finance:read_amounts": true,
      "people:read_limited": true,
      "people:read_care_context": false,
      "pledges:manage": true,
      "tasks:manage": false,
      "communications:manage": false,
      "settings:manage": false,
    },
    PASTORAL_CARE: {
      "finance:read_amounts": false,
      "people:read_limited": false,
      "people:read_care_context": true,
      "pledges:manage": false,
      "tasks:manage": true,
      "communications:manage": true,
      "settings:manage": false,
    },
  };

  it("locks down the full role permission matrix", () => {
    for (const role of APP_ROLES) {
      for (const [permission, allowed] of Object.entries(
        expectedPermissions[role],
      ) as [Permission, boolean][]) {
        expect(hasPermission(role, permission)).toBe(allowed);
      }
    }
  });

  it("gives admins full access", () => {
    expect(canSeeGivingAmounts("ADMIN")).toBe(true);
    expect(canSeeIndividualGivingAggregates("ADMIN")).toBe(true);
    expect(canManageCareWorkflows("ADMIN")).toBe(true);
    expect(hasPermission("ADMIN", "settings:manage")).toBe(true);
  });

  it("lets finance see giving amounts with limited people access", () => {
    expect(canSeeGivingAmounts("FINANCE")).toBe(true);
    expect(canSeeIndividualGivingAggregates("FINANCE")).toBe(true);
    expect(hasPermission("FINANCE", "people:read_limited")).toBe(true);
    expect(hasPermission("FINANCE", "pledges:manage")).toBe(true);
    expect(canManageCareWorkflows("FINANCE")).toBe(false);
  });

  it("blocks pastoral care from individual giving amounts and aggregates", () => {
    expect(canSeeGivingAmounts("PASTORAL_CARE")).toBe(false);
    expect(canSeeIndividualGivingAggregates("PASTORAL_CARE")).toBe(false);
    expect(canManageCareWorkflows("PASTORAL_CARE")).toBe(true);
  });
});
